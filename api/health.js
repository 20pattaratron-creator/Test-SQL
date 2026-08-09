export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'Data Insight SQL Dashboard API',
    runtime: 'Vercel Function'
  });
}
