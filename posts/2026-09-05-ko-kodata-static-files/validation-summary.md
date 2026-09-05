# Validation Summary: How to Bundle Templates and Static Files with ko's `kodata` and `KO_DATA_PATH`

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go: filesystem paths, environment variables, HTML templates, and `embed`.
- ko: command-local static assets, image layers, runtime paths, timestamps, and platform-specific symlink handling.
- HTTP: static file serving, URL prefixes, and cache behavior.
- Docker: image references, container creation, file extraction, and layer persistence.
- Shell utilities and Git commit timestamps.

## Sources Consulted
- ko static assets: https://ko.build/features/static-assets/
- ko v0.19.1 source (inspected directly, including `kodataPath`, `walkRecursive`, `tarKoData`, and environment configuration): https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go
- ko FAQ, timestamps and Windows limitations: https://ko.build/advanced/faq/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko getting started and registry configuration: https://ko.build/get-started/
- Go filesystem paths: https://pkg.go.dev/path/filepath
- Go HTML templates, `ParseFiles` and `ParseGlob`: https://pkg.go.dev/html/template
- Go HTTP file serving, `Dir`, and `StripPrefix`: https://pkg.go.dev/net/http
- Go embedded files: https://pkg.go.dev/embed
- Git pretty formats (`%ct`): https://git-scm.com/docs/pretty-formats
- Docker container creation: https://docs.docker.com/reference/cli/docker/container/create/
- Docker file copying: https://docs.docker.com/reference/cli/docker/container/cp/
- Docker container removal: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker storage and image layers: https://docs.docker.com/engine/storage/drivers/

## Issues Found
1. **The path helper's description overstated its validation.** It checks only whether `KO_DATA_PATH` is nonempty; it does not validate path components or enforce confinement. Replaced the claim about preventing absolute-path behavior with an accurate description of its environment check and joining behavior. Retained the restriction to application-owned relative components.
2. **The template glob did not guarantee that every required file existed.** `ParseGlob` can succeed when only one HTML file remains. Replaced it with `ParseFiles` naming both `base.html` and `status.html`, clarified the use of `html/template`, and explained why explicit filenames detect a missing required file. The startup claim now specifically covers missing files and parse errors.
3. **The static-server example silently used a relative path when the environment variable was absent.** Added the same nonempty environment check used by the template example before joining the static directory. This brings the example into agreement with the post's explicit-environment policy.

## Review Notes
- Confirmed the v0.19.1 canonical-root symlink check directly in the tagged source. Windows targets skip symlinks, and Linux uses `/var/run/ko`; the Windows runtime environment uses `C:\var\run\ko`. The generic static-assets documentation still contains an older external-link example, so the version-pinned source is the relevant authority for the stricter behavior.
- Confirmed command-specific asset discovery, a distinct data layer, reproducible data timestamps, and the documented `KO_DATA_DATE_EPOCH` override. Default timestamps do not provide normal Last-Modified/If-Modified-Since behavior; fingerprinted assets and explicit cache headers remain valid guidance.
- Confirmed that `embed.FS` implements `fs.FS`; the package also supports embedding into strings and byte slices. Neither packaging mechanism supplies persistence across container replacement.
- Compiled all three Go snippets together in a temporary package, supplying the imports and function context omitted by the tutorial fragments. Compilation passed. All shell code blocks passed `bash -n`.
- The snippets are integration fragments, not a complete web application: callers must use the parsed templates and start an HTTP listener. Parsing alone does not guarantee successful execution for every template/data combination.
- Reviewed the ko and Docker commands against official references. No registry push or end-to-end container run was performed: ko is not installed, and the example registry and application are placeholders. Image permissions and actual response headers still require the final-image checks described in the post.
- The link inventory command lists symlinks and their stored targets; it is not an automated policy validator. Attempts to retrieve GNU utility documentation failed, so those pages are not listed as consulted sources.
- The Docker extraction destination should be fresh for an unambiguous inventory; Docker copies a source directory beneath an already-existing destination directory.
- No deprecated APIs were identified in the examples. Changes were limited to technical corrections within existing sections.
