# How to Build a Drone Configuration Extension for Organization-Wide Pipeline Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Go, CI/CD, Automation, DevOps

Description: Implement a signed Drone configuration extension that returns centrally managed pipeline defaults with explicit fallback behavior.

A Drone configuration extension replaces the lookup that normally retrieves a repository's pipeline file. It can return a centrally maintained configuration for selected repositories and let other repositories keep their own files. It is useful for consistent defaults, but its fallback behavior must be an explicit policy decision.

The [configuration extension documentation](https://docs.drone.io/extensions/configuration/) defines the server settings and request metadata. Use a conversion extension instead when the goal is to transform an existing configuration after retrieval.

## Implement the SDK interface

The following service applies a fixed Node test pipeline to `acme/api` and `acme/web`. Other repositories fall back to their own configuration. Create a Go module and pin the SDK dependency:

```sh
go mod init example.com/drone-defaults
go get github.com/drone/drone-go/plugin/config@v1.7.1
```

Save this as `main.go`:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/drone/drone-go/drone"
    "github.com/drone/drone-go/plugin/config"
)

type defaults struct{}

func (defaults) Find(ctx context.Context, req *config.Request) (*drone.Config, error) {
    switch req.Repo.Slug {
    case "acme/api", "acme/web":
        return &drone.Config{Data: `kind: pipeline
type: docker
name: organization-tests
trigger:
  event:
    - push
    - pull_request
steps:
  - name: test
    image: node:24-alpine
    commands:
      - npm ci
      - npm test
`}, nil
    default:
        return nil, nil
    }
}

func main() {
    secret := os.Getenv("DRONE_YAML_SECRET")
    if secret == "" {
        log.Fatal("DRONE_YAML_SECRET is required")
    }
    handler := config.Handler(defaults{}, secret, nil)
    server := &http.Server{
        Addr: ":3000",
        Handler: http.MaxBytesHandler(handler, 1<<20),
        ReadHeaderTimeout: 5 * time.Second,
        ReadTimeout: 10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }
    log.Fatal(server.ListenAndServe())
}
```

Use Go 1.18 or newer for `http.MaxBytesHandler`. The fixed template assumes these repositories have compatible Node projects. Replace that template with reviewed organization defaults before deployment.

The SDK handler verifies Drone's request signature, decodes the request, serializes a returned configuration as JSON, and sends `204` for a nil result. Its [implementation](https://github.com/drone/drone-go/blob/v1.7.1/plugin/config/handler.go) resolves an ambiguity in the prose documentation: with this SDK, a successful response contains a JSON `data` field holding YAML, rather than a bare YAML HTTP response. Do not implement a different wire format by guessing from the phrase “raw configuration.”

## Connect the server to the extension

Deploy the compiled service on a private network reachable by the Drone server. Terminate HTTPS at a trusted proxy or add TLS to the service, and inject the shared secret through infrastructure secret management.

Configure Drone server with:

```text
DRONE_YAML_ENDPOINT=https://drone-defaults.internal.example.com
DRONE_YAML_SECRET=<same-shared-secret-as-extension>
```

These belong on the server, which fetches configuration, rather than the build runner. Keep the service independent of the repositories it governs so a repository change cannot replace its policy code.

The sample returns central YAML for selected repositories even if they already have a pipeline file. It does not first check whether their file exists. For “defaults only when missing,” explicitly fetch the requested file at the requested commit and distinguish absence from provider errors. Do not interpret an authorization error or transient timeout as proof that a file is absent.

## Decide whether fallback is permitted

Returning nil gives the repository control of its pipeline again. That is suitable for optional defaults. It is unsuitable for a mandatory policy if an unrecognized repository is meant to be blocked.

If central configuration is required, return an error for unknown repositories and use a separate validation extension for enforcement checks. Add bounds on generation time and output size. Log the repository, build number, chosen template version, and result without logging provider tokens or full request bodies.

## Validate the contract before rollout

Build the program, then test its `Find` method with a selected repository and an unrelated repository. Verify that the selected template parses, includes the intended events, and references approved images. Test the HTTP handler with a correctly signed request, a missing signature, and an invalid signature.

Finally, use a staging Drone server to exercise selection, fallback, extension unavailability, and malformed generated output. The service is on the build-start path, so failures must be visible and actionable. Keep an immutable template version and a rollback image available before enabling it for the whole organization.
