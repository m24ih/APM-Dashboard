import asyncio
import csv
import json
import os
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="APM Dashboard Data Publisher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data/dataset.csv"
static_data = {}
dynamic_data = []


@app.on_event("startup")
async def load_data():
    global static_data, dynamic_data

    if not os.path.exists(DATA_FILE):
        print(f"CRITICAL: {DATA_FILE} bulunamadı. Veri yayını başlatılamaz.")
        return

    with open(DATA_FILE, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        rows = list(reader)

        if not rows:
            print("CRITICAL: CSV dosyası boş.")
            return

        first_row = rows[0]
        static_data = {
            "building_id": first_row.get("building_id", "N/A"),
            "site_id": first_row.get("site_id", "N/A"),
            "primaryspaceusage": first_row.get("primaryspaceusage", "N/A"),
            "sqm_sqft": first_row.get("sqm / sqft", first_row.get("sqm", "N/A")),
        }

        def safe_float(val):
            try:
                return float(val)
            except (ValueError, TypeError):
                return 0.0

        for row in rows:
            dynamic_data.append(
                {
                    "timestamp": row.get("timestamp", ""),
                    "meter_reading": safe_float(row.get("meter_reading")),
                    "airTemperature": safe_float(row.get("airTemperature")),
                    "cloudCoverage": safe_float(row.get("cloudCoverage")),
                    "dewTemperature": safe_float(row.get("dewTemperature")),
                    "precipDepth1HR": safe_float(row.get("precipDepth1HR")),
                    "precipDepth6HR": safe_float(row.get("precipDepth6HR")),
                    "seaLvlPressure": safe_float(row.get("seaLvlPressure")),
                    "windDirection": safe_float(row.get("windDirection")),
                    "windSpeed": safe_float(row.get("windSpeed")),
                    "carbon_emission_kg": safe_float(row.get("carbon_emission_kg")),
                }
            )


@app.get("/api/static")
async def get_static_data():
    return static_data


async def data_generator():
    if not dynamic_data:
        yield f"data: {json.dumps({'error': 'Bellekte veri bulunamadi'})}\n\n"
        return

    index = 0
    total_records = len(dynamic_data)

    while True:
        row = dynamic_data[index]
        yield f"data: {json.dumps(row)}\n\n"

        index += 1
        if index >= total_records:
            index = 0

        # Saniyede 1 kez yayın yapar. Döngü hızı buradan kontrol edilir.
        await asyncio.sleep(1)


@app.get("/api/stream")
async def stream_data():
    return StreamingResponse(data_generator(), media_type="text/event-stream")
