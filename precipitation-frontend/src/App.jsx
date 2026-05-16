import PrecipitationChart from './components/PrecipitationChart';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ color: '#f8fafc', textAlign: 'center', marginBottom: 32 }}>
        🌧️ Yagis ve Bulutluluk Dashboard
      </h1>
      <div style={{ display: 'grid', gap: 24 }}>
        <PrecipitationChart />
      </div>
    </div>
  );
}