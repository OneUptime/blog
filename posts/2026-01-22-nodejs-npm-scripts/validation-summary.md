# Validation Summary: How to Use npm Scripts Effectively

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- npm scripts and lifecycle hooks
- package.json configuration
- cross-env
- dotenv
- npm-run-all
- concurrently
- webpack CLI
- ESLint
- Docker Compose
- Husky

## Sources Consulted
- npm CLI run-script documentation: https://docs.npmjs.com/cli/v11/commands/npm-run-script/
- npm scripts documentation: https://docs.npmjs.com/cli/v11/using-npm/scripts/
- npm package.json documentation: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- npm CLI local help output from npm 10.9.4: `npm help run-script`, `npm help scripts`
- cross-env package documentation: https://www.npmjs.com/package/cross-env
- dotenv package documentation: https://www.npmjs.com/package/dotenv
- npm-run-all README: https://github.com/mysticatea/npm-run-all/blob/master/README.md
- concurrently README: https://github.com/open-cli-tools/concurrently
- webpack CLI documentation: https://webpack.js.org/api/cli/
- webpack stats documentation: https://webpack.js.org/api/stats/
- Docker Compose CLI documentation: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose installation documentation: https://docs.docker.com/compose/install/
- ESLint CLI and migration documentation: https://eslint.org/docs/latest/use/command-line-interface and https://eslint.org/docs/latest/use/configure/migration-guide
- Husky documentation: https://typicode.github.io/husky/how-to.html

## Issues Found
- The plain `&` parallel execution section did not mention that this is POSIX-shell syntax and is not portable to Windows npm scripts. I renamed the subsection and added a note pointing readers to `npm-run-all` or `concurrently` for cross-platform parallel scripts.
- The dotenv custom path example passed `dotenv_config_path=.env.development` as a program argument after `server.js`. I changed it to set `DOTENV_CONFIG_PATH` before preloading `dotenv/config` with `cross-env`, which matches dotenv's preload configuration mechanism and remains cross-platform.
- The webpack bundle analysis example used `webpack --mode production --analyze`, which is not a standard webpack CLI analysis command. I changed it to generate webpack stats with `--profile --json=compilation-stats.json`, matching webpack's documented stats workflow.
- The Docker Compose examples used the legacy standalone `docker-compose` command. I updated them to the current Docker Compose V2 `docker compose` command.
- The package config override example used `npm config set my-app:port 8080`, which current npm rejects as an invalid option. I changed the script to read `npm_config_port` when supplied and fall back to `npm_package_config_port`, then updated the runtime override to `npm start --port=8080`.
- The complete example used `eslint . --ext .ts,.tsx,.js,.jsx`; this is not suitable for ESLint's current default flat config mode. I changed it to `eslint .`.
- The complete example used `husky install`, which is outdated for Husky v9. I changed it to `husky` and added Husky to the `devDependencies` shown in the example.

## Review Notes
The tutorial still contains some intentionally simple examples that use POSIX utilities such as `rm -rf`, `open`, and `pkill`. These are valid in Unix-like environments but are not cross-platform; the article separately recommends cross-platform helpers where that matters.
