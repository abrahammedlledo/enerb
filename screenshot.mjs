import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const url   = process.argv[2] || 'http://localhost:3000'
const label = process.argv[3] || ''

const dir = path.join(__dirname, 'temporary screenshots')
if (!fs.existsSync(dir)) fs.mkdirSync(dir)

const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'))
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(Boolean)
const next = nums.length ? Math.max(...nums) + 1 : 1
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`
const filepath = path.join(dir, filename)

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(url, { waitUntil: 'networkidle2' })

// Scroll through the page to trigger IntersectionObserver animations
await page.evaluate(async () => {
  await new Promise(resolve => {
    const totalHeight = document.body.scrollHeight
    let scrolled = 0
    const step = 600
    const timer = setInterval(() => {
      window.scrollBy(0, step)
      scrolled += step
      if (scrolled >= totalHeight) {
        clearInterval(timer)
        window.scrollTo(0, 0)
        setTimeout(resolve, 400)
      }
    }, 80)
  })
})
// Force all animated elements visible for the screenshot
await page.evaluate(() => {
  document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'))
})
await new Promise(r => setTimeout(r, 400))

await page.screenshot({ path: filepath, fullPage: true })
await browser.close()

console.log(`Screenshot saved: ${filepath}`)
