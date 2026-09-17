# Dataverse site

Static build of the Claude Design file `Dataverse Site.dc.html`. Plain HTML/CSS/JS, no build step.

```
index.html          Home (hero, services, process, time audit, work, pricing, contact)
blog/index.html     Blog listing  → Webflow Collection List page
blog/post.html      Post template → Webflow "Blog Posts Template" page
css/styles.css      All styles. Class-based, no inline styles. Theme tokens at top.
js/theme-init.js    Restores saved light/dark mode before paint (in <head>)
js/main.js          Light/dark toggle, scroll reveals, contact form
js/audit.js         Five-minute time audit calculator
js/hero.js          Hero 3D scene (Three.js via jsDelivr, ES module)
```

Run locally: `python3 -m http.server 8000` → http://localhost:8000

## Editing content
All copy is in the HTML files. Audit calculator copy/maths (industries, tasks, build suggestions, tier thresholds) is at the top of `js/audit.js`.
Image placeholders are `.placeholder` blocks — drop an `<img>` inside and it fills the frame.

## Theme
Fixed palette (Ember red) and font set (Syne / Familjen Grotesk / Azeret Mono), defined as CSS variables at the top of `css/styles.css`.
Header has a light/dark toggle (`data-mode` on `<html>`, remembered in localStorage).

## Hero
3D scene in `js/hero.js` (Three.js).
- Top of page: ribbon arches follow the cursor; light streaks run along them now and then.
- Scrolling down plays the fly-through on a full-screen stage: the camera passes through the arches, a slab field and a ring stack while three tagline phrases assemble letter by letter. Scrolling up rewinds. When it ends the stage fades out and the rest of the page scrolls in.
- Length of the fly-through = height of the runway `.hero-journey` in `css/styles.css` (520vh desktop, 420vh mobile).
- Tagline text: `data-taglines="Phrase one|Phrase two|Phrase three"` on the hero in `index.html` (last word of each phrase is highlighted).
- Tuning in `js/hero.js`: word windows `windows`, word positions `spots`, camera path `keys`, scroll smoothing `dt * 5`.
Falls back to the CSS gradient (and no runway) if WebGL is unavailable or for reduced-motion users.
Webflow: add the hero markup + runway div as an Embed and load `js/hero.js` with `<script type="module">` in page custom code.

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
5. Time audit: paste the `#audit` section markup + `js/audit.js` into an Embed (or page custom code). Light/dark toggle: `js/theme-init.js` in head code, `js/main.js` before `</body>`.
6. Contact form: replace with a native Form Block, same classes and field names (`name`, `email`, `message`). Currently it opens a prefilled email.

### Option B — keep static hosting, pull posts from Webflow
Use the Webflow Data API v2 (`/collections/{id}/items/live`) through a serverless function. Never put the API token in browser JS. Render the listing and post pages from that data using the same markup.
