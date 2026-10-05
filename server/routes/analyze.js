import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import Resume from '../models/Resume.js'
import Analysis from '../models/Analysis.js'
import { analyzeUploadedResume, analyzeResumeAgainstJob } from '../services/analysisService.js'
import { SUPPORTED_RESUME_TYPES, MAX_RESUME_BYTES } from '../services/documentParser.js'
import { analysisInputSchema } from '../validators/analysis.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_RESUME_BYTES, files: 1 }, fileFilter: (req, file, callback) => callback(null, SUPPORTED_RESUME_TYPES.has(file.mimetype)) })

async function createPersistedAnalysis({ userId, file, result }) {
  const resume = await Resume.create({ user: userId, filename: file.originalname, mimetype: file.mimetype, size: file.size, extracted: result.resumeProfile })
  const analysis = await Analysis.create({ user: userId, resume: resume.id, roleTitle: result.roleTitle, company: result.company, resumeName: file.originalname, jobDescription: result.jobDescription, score: result.score.overall, scoreComponents: result.score.components, scoreWeights: result.score.weights, resumeProfile: result.resumeProfile, jobProfile: result.jobProfile, matchedSkills: result.comparison.matchedSkills, missingSkills: result.comparison.missingSkills, partialMatches: result.comparison.partialMatches, relatedSkills: result.comparison.relatedSkills, explanation: result.explanation.summary, recommendations: result.explanation.recommendations })
  return { resume, analysis, result }
}

router.post('/', requireAuth, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Upload a PDF or DOCX resume under the resume field' })
    const input = analysisInputSchema.safeParse(req.body)
    if (!input.success) return res.status(400).json({ message: input.error.issues[0]?.message || 'Invalid analysis input' })
    const result = await analyzeUploadedResume({ file: req.file, ...input.data })
    const persisted = await createPersistedAnalysis({ userId: req.userId, file: req.file, result })
    req.app.get('io')?.to(req.userId).emit('analysis:created', persisted.analysis)
    res.status(201).json({ analysis: persisted.analysis, result })
  } catch (error) { next(error) }
})

router.get('/demo', async (req, res, next) => {
  try {
    const result = await analyzeResumeAgainstJob({
      roleTitle: 'Full Stack Developer', company: 'CV Slayer demo',
      resumeText: 'Jordan Lee\nSoftware Engineer\njordan@example.com\n\nSkills\nReact, Node.js, MongoDB, Python, JavaScript, REST APIs\n\nExperience\nBuilt responsive React applications and REST APIs using Node.js. Designed MongoDB data models and Python automation scripts.\n\nEducation\nBachelor of Science in Computer Science',
      jobDescription: 'We are hiring a Full Stack Developer. Required: React, Node.js, MongoDB, AWS, Docker, TypeScript. You will build REST APIs, ship reliable features, and collaborate with product. Preferred: Kubernetes, Redis. Bachelor degree and 3+ years experience preferred.',
    })
    res.json({ analysis: result })
  } catch (error) { next(error) }
})

export default router
