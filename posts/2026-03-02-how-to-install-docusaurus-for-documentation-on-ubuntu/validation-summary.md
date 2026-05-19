# Validation Summary: How to Install Docusaurus for Documentation on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Node.js
- npm
- Docusaurus
- React
- MDX
- Algolia DocSearch
- @easyops-cn/docusaurus-search-local
- nginx
- Git hooks

## Sources Consulted
- Docusaurus installation docs: https://docusaurus.io/docs/installation
- Docusaurus configuration docs: https://docusaurus.io/docs/configuration
- Docusaurus theme configuration docs: https://docusaurus.io/docs/api/themes/configuration
- Docusaurus code block and MDX docs: https://docusaurus.io/docs/markdown-features/code-blocks
- Docusaurus search docs: https://docusaurus.io/docs/search
- Docusaurus deployment docs: https://docusaurus.io/docs/deployment
- Docusaurus versioning docs: https://docusaurus.io/docs/versioning
- Node.js release schedule: https://github.com/nodejs/Release
- NodeSource distributions documentation: https://github.com/nodesource/distributions/blob/master/DEV_README.md
- @easyops-cn/docusaurus-search-local README: https://github.com/easyops-cn/docusaurus-search-local

## Issues Found
- The prerequisites said Docusaurus requires Node.js 18+. Current Docusaurus documentation requires Node.js 20.0 or above, so the prerequisite was updated to Node.js 20+.
- The NodeSource command installed Node.js 20 and described it as LTS. As of 2026-05-19, Node.js 20 reached end of life on 2026-04-30, so the install example was updated to Node.js 22 LTS with the current NodeSource setup-script flow.
- The Docusaurus Prism theme imports used the old deep import paths from `prism-react-renderer/themes/*`. Current Docusaurus examples import `themes` from `prism-react-renderer`, so the snippet was updated to use `prismThemes.github` and `prismThemes.dracula`.
- The commented blog-disable example placed `blog: false` inside the `blog` options object, which would be invalid if uncommented. The comment now explains that the blog object should be replaced with `blog: false`.
- The MDX example used an outer triple-backtick fence while also containing inner triple-backtick code blocks, and the inner code blocks closed with a language marker instead of a plain closing fence. The example now uses an outer four-backtick fence and valid inner code fences.

## Review Notes
The nginx static-site configuration, Docusaurus build and serve commands, sidebar configuration, local search theme setup, and versioning command match the reviewed documentation. The post still targets Ubuntu 20.04 and 22.04; Ubuntu 20.04 is outside standard support but remains usable in extended support contexts, so this was left unchanged.
