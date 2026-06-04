# Validation Summary: How to Run Burp Suite in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Burp Suite Community Edition
- Burp Suite Professional
- Burp Suite DAST
- Burp Scanner
- Docker and Docker Compose
- X11 and XQuartz display forwarding
- GitLab CI/CD
- OWASP Juice Shop and DVWA
- curl and OpenSSL

## Sources Consulted
- PortSwigger Burp Suite downloads: https://portswigger.net/burp/downloads
- PortSwigger Burp Suite Community Edition feature comparison: https://portswigger.net/burp/communitydownload
- PortSwigger command-line launch and Java requirements: https://portswigger.net/burp/documentation/desktop/troubleshooting/launch-from-command-line
- PortSwigger Burp Scanner availability: https://portswigger.net/burp/documentation/desktop/getting-started/running-your-first-scan
- PortSwigger Proxy settings: https://portswigger.net/burp/documentation/desktop/settings/tools/proxy
- PortSwigger CA certificate documentation: https://portswigger.net/burp/documentation/desktop/external-browser-config/certificate
- PortSwigger DAST REST API documentation: https://portswigger.net/burp/documentation/dast/user-guide/api-documentation/rest
- PortSwigger GitLab CI-driven scan documentation: https://portswigger.net/burp/documentation/dast/user-guide/ci-cd/ci-driven-scans/example-integrations/integrate-gitlab
- PortSwigger extension installation documentation: https://portswigger.net/burp/documentation/desktop/extend-burp/extensions/installing/manual-install
- Docker host network driver documentation: https://docs.docker.com/engine/network/drivers/host/
- Docker Compose file version documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI help from local `docker run --help`

## Issues Found
- The post described Burp Suite Community Edition as supporting vulnerability scanning and CI/CD scanning. Updated the text to clarify that automated vulnerability scanning requires Burp Suite Professional or Burp Suite DAST, while Community Edition is focused on manual testing.
- The GUI examples used `burpsuite/burp:community`, but PortSwigger does not publish an official Docker image for Burp Suite Community Edition. Updated the examples to use the custom `burp-suite-community` image built in the post.
- The Linux GUI example combined `--network host` with `-p 8080:8080`. Docker ignores published ports in host networking mode, so the host networking option was removed.
- The Dockerfile used `openjdk:17-slim`, but current Burp Suite JAR launches require Java 21. Updated the base image to `eclipse-temurin:21-jre-jammy` and adjusted the Dockerfile to support `JAVA_OPTS`.
- The Compose example used the obsolete top-level `version` field and mislabeled port 1337 as Intruder/Repeater results. Removed `version` and corrected the port comment.
- The headless example used an undocumented `--headless` Burp flag and duplicated the `java -jar` invocation after an ENTRYPOINT. Updated it to use `-Djava.awt.headless=true` through `JAVA_OPTS` and clarified that Community Edition does not run automated scans.
- The Burp config snippet included scanner settings that are not applicable to Community Edition. Removed the scanner block.
- The REST API section implied Community Edition automation via REST API and used local Professional-style URLs without the DAST API key URL pattern. Updated it to describe Burp Suite DAST REST API usage and include the API key path format.
- The GitLab CI example implied a Community Edition container could run a crawl/passive scan and copy a generated report. Replaced it with PortSwigger's documented DAST scan container pattern for GitLab CI.
- The extensions section implied mounting a `.BurpSuite/bapps` directory would pre-install BApp Store extensions. Updated it to describe mounting extension files for manual loading or importing `.bapp` files through Burp.
- The production tips referred to persisted project files and latest vulnerability checks for Community Edition. Updated wording to distinguish settings/exported files from Professional/DAST scanner behavior.

## Review Notes
The Docker image build was not fully executed because Docker Hub returned an unauthenticated pull rate-limit error while pulling `eclipse-temurin:21-jre-jammy`. Markdown JSON and YAML snippets were syntax-checked locally.
