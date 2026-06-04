# Validation Summary: How to Use Docker for Chaos Engineering with Pumba

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Pumba
- Linux traffic control / netem
- iptables
- Python
- Requests
- CSV

## Sources Consulted
- Pumba README: https://github.com/alexei-led/pumba
- Pumba User Guide: https://github.com/alexei-led/pumba/blob/master/docs/guide.md
- Pumba Network Chaos documentation: https://github.com/alexei-led/pumba/blob/master/docs/network-chaos.md
- Pumba Deployment Guide: https://github.com/alexei-led/pumba/blob/master/docs/deployment.md
- Docker Compose file reference for `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Python `csv` module documentation: https://docs.python.org/3/library/csv.html
- Requests Quickstart documentation: https://requests.readthedocs.io/en/master/user/quickstart/

## Issues Found
- The post used the deprecated Docker Hub image `gaiaadm/pumba`. Updated examples to use the current recommended GHCR image, `ghcr.io/alexei-led/pumba`, based on the Pumba deployment guide.
- The binary installation command pinned Pumba `0.9.7`, which is outdated. Updated it to use the latest-release download URL.
- The Docker Compose snippets included the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose treats `version` as informative only and warns that it is obsolete.
- The "random container" kill example did not include Pumba's `--random` flag. Added `--random` so the command matches the explanation.
- The combined network-effects example chained `delay` and `loss` as if Pumba accepted multiple `netem` subcommands in one invocation. Replaced it with concurrent `netem delay` and `iptables loss` commands, matching Pumba's documented approach for combined/asymmetric network degradation.
- The scheduled API killer comment said it randomly killed the API container, but the command targets a single explicit container. Updated the comment to say it kills the API container every 5 minutes.

## Review Notes
The remaining Pumba command flags (`kill --signal`, `pause --duration`, `netem --duration`, `delay --time`, `delay --jitter`, `loss --percent`, and `rate --rate`) match current upstream documentation. The Python monitoring script is syntactically valid and uses documented `requests.get(..., timeout=...)` and `csv.DictWriter` patterns.
