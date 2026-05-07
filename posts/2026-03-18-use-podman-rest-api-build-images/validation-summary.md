# Validation Summary: How to Use the Podman REST API to Build Images

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman REST API
- Libpod image build endpoint
- Docker-compatible image build endpoint
- Containerfiles
- `curl`
- Python

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman API route definitions: https://github.com/containers/podman/blob/main/pkg/api/server/register_images.go
- Podman build handler implementation: https://github.com/containers/podman/blob/main/pkg/api/handlers/compat/images_build.go
- Podman bindings build response parsing: https://github.com/containers/podman/blob/main/pkg/bindings/images/build.go
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- Python `http.client` documentation: https://docs.python.org/3/library/http.client.html

## Issues Found
- The `buildargs` and `labels` examples passed raw JSON directly in the query string. Podman documents these values as URI-component-encoded JSON, so I changed the `curl` examples to encode them before sending the request.
- The multi-stage example replaced the earlier Node.js sample with a Go build but did not create the required Go source files and also did not rebuild the tar archive after changing the `Containerfile`. I replaced it with a valid multi-stage Node.js example that matches the existing sample project and added the missing tar rebuild step.
- The Docker-compatible example used `/v1.41/build`, while Podman documents its compatibility layer as Docker v1.40. I updated the example to `/v1.40/build`.
- The Python example built the query string by concatenating raw JSON and then tried to read an `images` field from the streamed response. The current Podman build response uses streamed `stream` messages and may also include `aux` data, so I updated the code to use `urlencode()` and parse the actual response fields.
- The `rm` parameter description said it removes intermediate containers "after build". Podman documents this as removal after a successful build, so I corrected that wording.

## Review Notes
- Podman's build handler and CLI documentation both indicate support for `squash`, but the generated API route comments in the current source still describe the parameter as "Silently ignored." The post's `squash` section was left in place because the handler forwards the value into the build options and the CLI docs describe it as supported.
- When you manually create the build-context tar archive, `.containerignore` is still used during build processing, but it does not reduce the size of the tar archive you upload the way `podman build` does when it assembles the context itself.
- End-to-end execution against a live Podman service was not possible in this environment because `podman` is not installed here.
