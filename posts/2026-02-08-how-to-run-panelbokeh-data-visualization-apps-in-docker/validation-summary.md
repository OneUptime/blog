# Validation Summary: How to Run Panel/Bokeh Data Visualization Apps in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Python 3.12
- Bokeh server
- Panel
- pandas
- NumPy
- SQLAlchemy
- PostgreSQL

## Sources Consulted
- Bokeh server command documentation: https://docs.bokeh.org/en/latest/docs/reference/command/subcommands/serve.html
- Bokeh server application documentation: https://docs.bokeh.org/en/latest/docs/user_guide/server/app.html
- Bokeh scatter plot documentation: https://docs.bokeh.org/en/latest/docs/user_guide/basic/scatters.html
- Bokeh deployment and WebSocket origin documentation: https://docs.bokeh.org/en/latest/docs/user_guide/server/deploy.html
- Panel `panel serve` documentation: https://panel.holoviz.org/tutorials/intermediate/serve.html
- Panel multi-process serving documentation: https://panel.holoviz.org/how_to/concurrency/processes.html
- Panel basic authentication documentation: https://panel.holoviz.org/how_to/authentication/basic.html
- Panel `DateRangeSlider` documentation: https://panel.holoviz.org/reference/widgets/DateRangeSlider.html
- Panel `Select` documentation: https://panel.holoviz.org/reference/widgets/Select.html
- Panel `pn.cache` documentation: https://panel.holoviz.org/how_to/caching/memoization.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- Bokeh `figure.circle(..., size=...)` is deprecated in current Bokeh releases. Replaced both scatter-marker examples with `figure.scatter(..., size=...)`, matching Bokeh's current scatter-plot guidance.
- Panel `DateRangeSlider` and `Select` documentation now marks `name` as a deprecated alias for `label`. Updated those widgets to use `label`.
- The Docker Compose example used the obsolete top-level `version: "3.8"` key. Removed it so the snippet follows the current Compose Specification.
- The Compose environment for the dashboard included `DB_HOST` and `DB_NAME` but omitted `DB_USER` and `DB_PASS`, while the later PostgreSQL example reads those variables. Added matching credentials to keep the examples consistent.

## Review Notes
- The `--allow-websocket-origin "*"` examples are technically valid, but Bokeh documents this as suitable only for testing, experimentation, and local notebook usage. The post already warns to restrict WebSocket origins in production.
- Panel's `--num-procs` option is supported, but Panel documents that Tornado multi-process mode does not actively balance connections across processes and should generally be no larger than the available processor count.
- The live PostgreSQL example requires SQLAlchemy and a PostgreSQL DBAPI driver in the image used to run it.
