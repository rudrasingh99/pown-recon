const querystring = require('querystring')

const { Transform } = require('../transform')
const { scrapeWithPuppeteer, serializeScrapeFunction } = require('./utils/scrape')

const scrapeZoomeyeSearchResults = class extends Transform {
    static get alias() {
        return ['scrape_zoomeye_search_results', 'szsr']
    }

    static get title() {
        return 'Scrape ZoomEye Search Results'
    }

    static get description() {
        return 'Performs first page scrape on ZoomEye search results'
    }

    static get types() {
        return ['*']
    }

    static get options() {
        return {}
    }

    async run(items, options) {
        const results = await Promise.all(items.map(async({ id: target = '', label = '' }) => {
            const query = querystring.stringify({
                q: label
            })

            const uri = `https://www.zoomeye.org/searchResult?${query}`

            let puppeteer

            const { log } = await scrapeWithPuppeteer(serializeScrapeFunction(async() => {
                const browser = await puppeteer.launch()
                const page = await browser.newPage()

                await page.goto(uri)

                const data = await page.evaluate(() => {
                    return JSON.stringify(Array.from(document.querySelectorAll('.search-result-item')).map((item) => {
                        return {
                            title: (item.querySelector('.search-result-item-title') || {}).textContent,
                            uri: (item.querySelector('.search-result-item-title[rel]') || {}).href,
                            tags: Array.from(item.querySelectorAll('.search-result-tags button')).map(item => item.textContent),
                            code: item.querySelector('pre').textContent
                        }
                    }))
                })

                console.log(data)

                await browser.close()
            }).replace(/^/, `const uri = ${JSON.stringify(uri)}`))

            const items = JSON.parse(log)

            return items.map(({ title, uri, tags }) => {
                return { id: this.makeId('zoomeye:search:item', title), type: 'zoomeye:search:item', label: title, props: { title, uri, tags }, edges: [target] }
            })
        }))

        return this.flatten(results, 2)
    }
}

module.exports = {
    scrapeZoomeyeSearchResults
}