# APM-Dashboard

Real-Time Carbon Tracking Smart Building System Dashboard.

This project consists of a React/Vite frontend and a FastAPI Python backend, streaming real-time environmental and carbon emission data.

## 🚀 VDS Production Deployment

To easily deploy this dashboard to your Virtual Dedicated Server (VDS) using Nginx Proxy Manager and Cloudflare, you don't need to build the project manually. The Docker images are automatically built and hosted on GitHub Container Registry (GHCR).

### Steps:

1. **Connect to your VDS via SSH.**
2. **Create a directory** for your project and enter it:
   ```bash
   mkdir apm-dashboard && cd apm-dashboard
   ```
3. **Create a `docker-compose.yml` file** inside that directory with the following content:

```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/m24ih/apm-dashboard-backend:latest
    container_name: apm_backend
    restart: always
    expose:
      - "8000"
    networks:
      - apm_network

  frontend:
    image: ghcr.io/m24ih/apm-dashboard-frontend:latest
    container_name: apm_frontend
    restart: always
    ports:
      - "8080:80" # Maps port 8080 on your VDS to the frontend container
    depends_on:
      - backend
    networks:
      - apm_network

networks:
  apm_network:
    driver: bridge
```

4. **Start the application:**
   ```bash
   docker-compose up -d
   ```

### Nginx Proxy Manager Setup:

Once the containers are running, log in to your Nginx Proxy Manager:
- Add a new **Proxy Host**.
- **Domain Names:** `dashboard.yourdomain.com` (or whatever you use)
- **Scheme:** `http`
- **Forward Hostname / IP:** (Your VDS IP or Docker gateway)
- **Forward Port:** `8080` (Matching the port we mapped above)
- **Websockets Support:** ✅ Must be **ENABLED** (Required for the live data stream to work).

*(Make sure your Cloudflare DNS points to your VDS IP and is proxied/orange-clouded)*
