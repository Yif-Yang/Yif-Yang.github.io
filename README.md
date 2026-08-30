# Yifan Yang — Personal Website

Source for [yif-yang.github.io](https://yif-yang.github.io/), a static research portfolio built with HTML, CSS, and vanilla JavaScript.

## Local preview

From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deployment

Pushes to `main` deploy through the GitHub Pages workflow in `.github/workflows/pages.yml`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The source repository is private. The published site's availability and visibility depend on the GitHub account plan and repository Pages settings; a private repository does not by itself make the Pages site private.
