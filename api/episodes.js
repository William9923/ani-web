// Vercel serverless function — GET /api/episodes?id=...&mode=sub
const { episodes } = require('./_lib')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id = '', mode = 'sub' } = req.query
  try {
    const list = await episodes(id, mode)
    res.status(200).json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
