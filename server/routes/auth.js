import { Router } from 'express'
import User from '../models/User.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()
const isProduction = process.env.NODE_ENV === 'production'
const cookieOptions = { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction, maxAge: 7 * 24 * 60 * 60 * 1000 }

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email, and an 8-character password are required' })
    const user = await User.create({ name, email, password })
    res.cookie('access_token', signToken(user.id), cookieOptions).status(201).json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password')
    if (!user || !(await user.comparePassword(req.body.password))) return res.status(401).json({ message: 'Invalid email or password' })
    res.cookie('access_token', signToken(user.id), cookieOptions).json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) { next(error) }
})

router.post('/logout', (req, res) => { res.clearCookie('access_token', cookieOptions).status(204).end() })
router.get('/me', requireAuth, async (req, res, next) => { try { const user = await User.findById(req.userId).select('name email avatarUrl'); res.json({ user }) } catch (error) { next(error) } })
export default router
