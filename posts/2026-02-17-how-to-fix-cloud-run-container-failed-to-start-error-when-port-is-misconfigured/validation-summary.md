# Validation Summary: How to Fix Cloud Run Container Failed to Start Error When Port Is Misconfigured

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Docker and Dockerfile
- Node.js / Express
- Python / Flask
- Gunicorn
- Go net/http
- Java / Spring Boot
- Ruby on Rails
- Rust / Actix Web
- Cloud Logging

## Sources Consulted
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Run container port configuration: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Google Cloud Run troubleshooting guide: https://docs.cloud.google.com/run/docs/troubleshooting
- Google Cloud CLI `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud CLI `gcloud logging read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Dockerfile reference for `EXPOSE`: https://docs.docker.com/reference/dockerfile/
- Node.js `server.listen()` documentation: https://nodejs.org/api/net.html
- Flask API and CLI documentation: https://flask.palletsprojects.com/en/stable/api/
- Gunicorn settings documentation: https://docs.gunicorn.org/en/stable/settings.html
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Spring Boot application properties: https://docs.spring.io/spring-boot/appendix/application-properties/
- Ruby on Rails command line guide: https://guides.rubyonrails.org/command_line.html
- Actix Web server documentation: https://actix.rs/docs/server/

## Issues Found
- The Node.js / Express example incorrectly labeled `app.listen(8080)` as binding to localhost. Node.js listens on the unspecified address when the host is omitted, so I changed the wrong example to `app.listen(8080, '127.0.0.1')` and added a note about the omitted-host behavior.
- The introduction called this the single most common Cloud Run deployment error and said it almost always came down to three port-related issues, while the article lists four issues and one is an application crash. I softened this to "one of the most common" and "a few port-related issues."
- The localhost explanation described Cloud Run's health check as coming from outside the container. I changed this to the documented requirement that the ingress container listen on all interfaces, avoiding an imprecise health-check explanation.
- The `gcloud run services describe` comment said Cloud Run was configured to "probe" the port. I changed it to "send requests to," matching Cloud Run's container port configuration terminology.

## Review Notes
The main Cloud Run guidance is technically correct: the ingress container must listen on `0.0.0.0` on the configured port, Cloud Run injects `PORT` into the ingress container, the default request port is 8080, and `--port` sets both the request port and `PORT` environment variable. The `EXPOSE`, Docker local test, Cloud Logging, Gunicorn, Flask, Go, Spring Boot, Rails, and Actix examples are consistent with the referenced documentation.
