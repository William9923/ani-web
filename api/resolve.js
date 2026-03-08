// Vercel serverless function — GET /api/resolve?id=...&ep=...&mode=sub
const { resolve } = require('./_lib')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id = '', ep = '', mode = 'sub' } = req.query
  try {
    const result = await resolve(id, ep, mode)
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
