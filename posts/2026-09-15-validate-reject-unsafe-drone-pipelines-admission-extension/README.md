# How to Validate and Reject Unsafe Drone Pipelines with an Admission Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Security, Go, CI/CD, DevOps

Description: Use the correct Drone validation extension to reject unsafe pipeline configuration, while keeping login admission controls separate.

Drone uses **admission extension** to mean a login access-control hook. It does not inspect pipeline YAML. To reject unsafe pipelines before scheduling, implement a **validation extension**. The distinction is explicit in Drone's [admission documentation](https://docs.drone.io/extensions/admission/) and [validation documentation](https://docs.drone.io/extensions/validation/).

This guide implements that pipeline-validation control. It intentionally accepts only a small Docker pipeline format so unsupported execution features fail closed instead of being silently ignored.

## Define a narrow permitted format

For a first policy, permit only named Docker pipelines containing ordinary command steps that use one approved image. Disallow everything else, including services, volumes, environment injection, custom clone configuration, and privilege flags. This is restrictive, but its enforcement is understandable.

Create a Go module and install the pinned dependencies:

```sh
go mod init example.com/drone-policy
go get github.com/drone/drone-go@v1.7.1 gopkg.in/yaml.v3@v3.0.1
```

Save the following as `main.go`:

```go
package main

import (
    "context"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "strings"
    "time"

    "github.com/drone/drone-go/plugin/validator"
    "gopkg.in/yaml.v3"
)

type step struct {
    Name string `yaml:"name"`
    Image string `yaml:"image"`
    Commands []string `yaml:"commands"`
}
type pipeline struct {
    Kind string `yaml:"kind"`
    Type string `yaml:"type"`
    Name string `yaml:"name"`
    Steps []step `yaml:"steps"`
}
type policy struct{}

func (policy) Validate(ctx context.Context, req *validator.Request) error {
    decoder := yaml.NewDecoder(strings.NewReader(req.Config.Data))
    decoder.KnownFields(true)
    names := map[string]bool{}
    for {
        var p pipeline
        err := decoder.Decode(&p)
        if err == io.EOF { break }
        if err != nil { return fmt.Errorf("unsupported YAML: %w", err) }
        if p.Kind != "pipeline" || p.Type != "docker" || p.Name == "" {
            return fmt.Errorf("only named Docker pipelines are permitted")
        }
        if names[p.Name] { return fmt.Errorf("duplicate pipeline name") }
        names[p.Name] = true
        if len(p.Steps) == 0 { return fmt.Errorf("pipeline has no steps") }
        stepNames := map[string]bool{}
        for _, s := range p.Steps {
            if s.Name == "" || stepNames[s.Name] || len(s.Commands) == 0 {
                return fmt.Errorf("steps need unique names and commands")
            }
            stepNames[s.Name] = true
            if s.Image != "alpine:3.22" {
                return fmt.Errorf("step %q uses an unapproved image", s.Name)
            }
        }
    }
    if len(names) == 0 { return fmt.Errorf("empty configuration") }
    return nil
}

func main() {
    secret := os.Getenv("DRONE_VALIDATE_PLUGIN_SECRET")
    if secret == "" { log.Fatal("validation secret is required") }
    handler := validator.Handler(secret, policy{}, nil)
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

Use Go 1.18 or newer. The YAML decoder checks known fields, and the code evaluates every document and every permitted step. The [yaml.v3 package](https://pkg.go.dev/gopkg.in/yaml.v3) documents `KnownFields` and stream decoding.

The example image tag is an easily tested baseline. For supply-chain enforcement, replace it with an approved digest and control how that digest is updated. A registry prefix check alone would trust every image that someone can publish under that prefix.

## Register the correct extension

Deploy the service behind HTTPS on a network reachable from the Drone server, and configure:

```text
DRONE_VALIDATE_PLUGIN_ENDPOINT=https://drone-policy.internal.example.com
DRONE_VALIDATE_PLUGIN_SECRET=<shared-secret>
```

Use the SDK's signed-request handler rather than accepting an arbitrary authorization header. The [SDK handler](https://github.com/drone/drone-go/blob/v1.7.1/plugin/validator/handler.go) returns `204` for acceptance and `400` with an error for rejection. This differs slightly from the documentation's example `200` success response; both are successful HTTP responses in the extension contract.

## Prove rejection with adversarial fixtures

Test an accepted pipeline first. Then verify rejection after adding `privileged: true`, a host volume, a service, a second document with another pipeline type, an unapproved image, an unknown field, malformed YAML, or duplicate names. Test the forbidden feature in the last document as well as the first.

The strict format also rejects legitimate features such as triggers. Add each new field deliberately, with a corresponding policy rule and tests. Do not switch off strict decoding just to make a repository pass.

An allowed command still executes arbitrary code inside its container. This validator therefore needs runners without privileged plugin exceptions, dangerous mounts, ambient credentials, or unrestricted access to sensitive networks. Configuration checks constrain available execution features; they do not make an arbitrary script trustworthy.

Exercise the extension through a staging server with malformed signatures and extension downtime. Confirm that failed validation prevents scheduling, and inspect any Jsonnet or conversion-extension path used by your deployment so the policy covers the effective configuration. Log concise rejection reasons and policy versions, then roll out to representative repositories before making enforcement universal.
