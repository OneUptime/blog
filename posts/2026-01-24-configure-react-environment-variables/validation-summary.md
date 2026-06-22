# Validation Summary: How to Configure React Environment Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- Create React App / react-scripts
- Vite
- Webpack
- dotenv and dotenv-webpack
- TypeScript
- Docker and nginx
- GitHub Actions
- JavaScript browser runtime configuration

## Sources Consulted
- Create React App documentation: Adding Custom Environment Variables - https://create-react-app.dev/docs/adding-custom-environment-variables/
- React documentation/blog: Sunsetting Create React App - https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Vite documentation: Env Variables and Modes - https://vite.dev/guide/env-and-mode
- Webpack documentation: DefinePlugin - https://webpack.js.org/plugins/define-plugin/
- dotenv-webpack README - https://github.com/mrsteele/dotenv-webpack/blob/master/README.md
- GitHub Actions documentation: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions documentation: Expressions - https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Actions documentation: Using secrets in GitHub Actions - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

## Issues Found
- Create React App is deprecated for new apps as of February 14, 2025. Updated the CRA section to frame the instructions as applicable to existing CRA projects using `react-scripts`.
- The Create React App `.env` priority list was described as "later files override earlier ones" and listed files from lowest to highest priority. CRA documentation states that files on the left have more priority, and `.env.local` is not loaded for `npm test`. Updated the block to show highest-to-lowest priority and removed `.env.local` from the test priority list.
- The dotenv-webpack example comments described `allowEmptyValues` and `safe` as exposure controls. Official dotenv-webpack documentation defines `allowEmptyValues` as controlling empty values in safe mode and `safe` as validating variables against `.env.example`. Updated the comments to describe the actual behavior.

## Review Notes
- The Docker runtime `config.js` generation approach is valid for simple values, but production systems should escape or serialize injected values carefully to avoid malformed JavaScript if an environment value contains quotes or other special characters.
- Vite environment variables are exposed as strings and only `VITE_`-prefixed variables are exposed to client code by default, which the post handles correctly.
- Webpack `DefinePlugin` replacement and build-time exposure behavior are described accurately after review.
