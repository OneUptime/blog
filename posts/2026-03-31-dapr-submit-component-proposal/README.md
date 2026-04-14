# How to Submit a Dapr Component Proposal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Proposal, Open Source, Contribution

Description: Submit a new Dapr component proposal by writing a design document, implementing the component in components-contrib, and navigating the review and certification process.

---

## What is a Dapr Component?

Dapr components are pluggable implementations of building blocks - state stores, pub/sub brokers, secret stores, bindings, and more. All community components live in `github.com/dapr/components-contrib`. Proposing a new component makes a new infrastructure system available to all Dapr users.

## Proposal Process Overview

1. Check if the component already exists or has an open issue
2. Open a GitHub issue for discussion
3. Write a design document (for significant components)
4. Implement the component in `components-contrib`
5. Submit PR with tests and conformance test suite results
6. Pass stability certification

## Step 1: Check Existing Components

```bash
# List existing components
gh api repos/dapr/components-contrib/git/trees/main \
  --jq '.tree[] | select(.type=="tree") | .path' | sort

# Or browse GitHub
# https://github.com/dapr/components-contrib/tree/main/state
```

## Step 2: Open a Proposal Issue

Use the component proposal template on GitHub:

```markdown
## Component Type
State Store / Pub/Sub / Secret Store / Binding (Input|Output) / Name Resolution

## Component Name
`state.mynewdb` or `pubsub.mynewbroker`

## Motivation
Why is this component needed? What use case does it serve?

## Implementation Plan
- Which SDK/library will be used?
- Estimated timeline
- Are you committed to maintaining this component?

## Links
- Official SDK: https://...
- Documentation: https://...
```

## Step 3: Implement the Component

```bash
# Clone components-contrib
git clone https://github.com/YOUR_USERNAME/components-contrib.git
cd components-contrib

# Create component directory
mkdir -p state/mynewdb
touch state/mynewdb/mynewdb.go
touch state/mynewdb/metadata.go
touch state/mynewdb/mynewdb_test.go
```

Implement the component interface:

```go
// state/mynewdb/mynewdb.go
package mynewdb

import (
    "context"

    "github.com/dapr/components-contrib/state"
    "github.com/dapr/kit/logger"
)

type MyNewDB struct {
    logger   logger.Logger
    client   *mynewdb.Client
    metadata myNewDBMetadata
}

func NewMyNewDBStateStore(logger logger.Logger) state.Store {
    return &MyNewDB{logger: logger}
}

func (m *MyNewDB) Init(ctx context.Context, metadata state.Metadata) error {
    // Parse metadata, initialize client
    return nil
}

func (m *MyNewDB) Get(ctx context.Context, req *state.GetRequest) (*state.GetResponse, error) {
    // Implement get
    return nil, nil
}

func (m *MyNewDB) Set(ctx context.Context, req *state.SetRequest) error {
    // Implement set
    return nil
}

func (m *MyNewDB) Delete(ctx context.Context, req *state.DeleteRequest) error {
    // Implement delete
    return nil
}

func (m *MyNewDB) Close() error {
    // Clean up resources
    return nil
}

func (m *MyNewDB) Features() []state.Feature {
    return []state.Feature{
        state.FeatureETag,
        state.FeatureTransactional,
    }
}
```

## Step 4: Register the Component

Component registration happens in the Dapr runtime repository (`dapr/dapr`), not in `components-contrib`. Add a registration file in `cmd/daprd/components/`:

```go
// In the dapr/dapr repo: cmd/daprd/components/state_mynewdb.go
package components

import (
    mynewdb "github.com/dapr/components-contrib/state/mynewdb"
    "github.com/dapr/dapr/pkg/components/state"
    "github.com/dapr/kit/logger"
)

func init() {
    state.DefaultRegistry.RegisterComponent(func(l logger.Logger) state.Store {
        return mynewdb.NewMyNewDBStateStore(l)
    }, "mynewdb")
}
```

## Step 5: Run Conformance Tests

```bash
# Run the built-in conformance test suite
# Requires the component's infrastructure to be running
go test -v -tags=conftests -count=1 \
  ./tests/conformance \
  -run="TestStateConformance/mynewdb"
```

## Step 6: Submit PR

```bash
git checkout -b feat/add-mynewdb-state-store
git add state/mynewdb/
git commit -s -m "feat(state): add MyNewDB state store component"

gh pr create \
  --repo dapr/components-contrib \
  --title "feat(state): add MyNewDB state store component" \
  --body "Adds state store implementation for MyNewDB. See proposal issue #1234.

## Conformance Tests
All conformance tests pass with MyNewDB 3.0."
```

## Summary

Submitting a Dapr component proposal involves opening a GitHub issue to discuss the component, implementing the appropriate interface in `components-contrib`, registering the component, running conformance tests, and submitting a pull request. The maintainer review process includes stability certification which determines which tier (Alpha/Beta/Stable) your component achieves at launch.
