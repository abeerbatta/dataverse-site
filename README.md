# Dataverse site

Static build of the Claude Design file `Dataverse Site.dc.html`. Plain HTML/CSS/JS, no build step.

```
index.html          Home (hero, services, process, time audit, work, pricing, contact)
blog/index.html     Blog listing  → Webflow Collection List page
blog/post.html      Post template → Webflow "Blog Posts Template" page
css/styles.css      All styles. Class-based, no inline styles. Theme tokens at top.
js/main.js          Scroll reveals
js/audit.js         Five-minute time audit calculator
js/book.js          Call request form (progress, segmented choices, cursor glow)
js/demos.js         Looping mini-UI demos in Selected work
js/hero.js          Hero 3D scene (Three.js via jsDelivr, ES module)
js/ribbon.js        Shared 3D helpers (ribbon geometry, streak shader)
js/network.js       Constellation network behind the contact section
```

Run locally: `python3 -m http.server 8000` → http://localhost:8000

## Editing content
All copy is in the HTML files. Audit calculator copy/maths (industries, tasks, build suggestions, tier thresholds) is at the top of `js/audit.js`.
Image placeholders are `.placeholder` blocks — drop an `<img>` inside and it fills the frame.

## Theme
One dark palette (Ember red) and one font set (Syne / Familjen Grotesk / Azeret Mono), defined as CSS variables at the top of `css/styles.css`.

## Hero
3D scene in `js/hero.js` (Three.js).
- Top of page: ribbon arches follow the cursor; light streaks run along them now and then.
- Scrolling down plays the fly-through on a full-screen stage: the camera passes through the arches, a slab field and a ring stack while three tagline phrases assemble letter by letter. Scrolling up rewinds it while it is still running.
- It plays once per visit: once the runway has scrolled fully out of sight, `finish()` collapses it (and corrects the scroll position) so scrolling back up shows the plain hero. Reloading the page arms it again.
- Length of the fly-through = height of the runway `.hero-journey` in `css/styles.css` (300vh desktop, 240vh mobile).
- Tagline text: `data-taglines="Phrase one|Phrase two|Phrase three"` on the hero in `index.html` (last word of each phrase is highlighted).
- Tuning in `js/hero.js`: word windows `windows`, word positions `spots`, camera path `keys`, scroll smoothing `dt * 5`.
Falls back to the CSS gradient (and no runway) if WebGL is unavailable or for reduced-motion users.
Webflow: add the hero markup + runway div as an Embed and load `js/hero.js` with `<script type="module">` in page custom code.

## Constellation network
`js/network.js` draws the closing scene behind the contact section: nodes joined by links drawn as fine dust, a few nodes in the accent colour, pulses of light running the links, and a far star field. It leans with the cursor and drifts as the section scrolls. Node count, link distance and pulse count are the values at the top of the file. Only renders while that section is on screen; skipped without WebGL or for reduced-motion visitors.

## Webflow CMS (blog)

### Collection: `Blog Posts`
| Field           | Slug             | Type         | Bound in `post.html` via |
|-----------------|------------------|--------------|--------------------------|
| Name            | `name`           | Plain text   | `data-cms="name"` (h1)   |
| Slug            | `slug`           | Slug         | URL `/blog/{slug}`       |
| Excerpt         | `excerpt`        | Plain text   | `data-cms="excerpt"`     |
| Cover image     | `cover-image`    | Image        | `data-cms="cover-image"` |
| Category        | `category`       | Option or Reference | `data-cms="category"` |
| Published date  | `published-date` | Date         | `data-cms="published-date"` (format `MMM D, YYYY`) |
| Read time       | `read-time`      | Plain text   | `data-cms="read-time"`   |
| Author          | `author`         | Plain text or Reference | `data-cms="author"` |
| Post body       | `post-body`      | Rich text    | `data-cms="post-body"`   |

### Option A — move the site into Webflow (recommended)
1. Import `css/styles.css` classes (or paste into Site Settings → Custom Code while rebuilding). Class names are Webflow-safe.
2. Header and footer → Components.
3. `blog/index.html`: the `.w-dyn-list > .w-dyn-items > .w-dyn-item` block is a Collection List bound to Blog Posts, sorted by published date desc. Bind each field from the sample item, delete the other two samples.
4. `blog/post.html`: build the Collection Template page; bind each `data-cms` element to the field of the same slug. `.w-richtext` styles already cover h2/h3/h4, lists, quotes, figures, code.
5. Time audit: paste the `#audit` section markup + `js/audit.js` into an Embed (or page custom code). Load `js/main.js` before `</body>` for the scroll reveals.
6. Call request form (`#book`): rebuild as a native Form Block keeping the field names (`name`, `business`, `email`, `phone`, `industry`, `callTime`, `size`, `message`). Currently `js/book.js` opens a prefilled email on submit.

### Option B — keep static hosting, pull posts from Webflow
Use the Webflow Data API v2 (`/collections/{id}/items/live`) through a serverless function. Never put the API token in browser JS. Render the listing and post pages from that data using the same markup.
