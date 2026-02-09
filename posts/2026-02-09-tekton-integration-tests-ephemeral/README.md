# How to Build a Tekton Pipeline That Runs Integration Tests Against Ephemeral Kubernetes Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, Testing, CI/CD, Integration Testing

Description: Create Tekton pipelines that provision ephemeral Kubernetes namespaces for isolated integration testing, with automatic cleanup and parallel test execution for faster CI/CD feedback.

---

Integration testing in Kubernetes requires isolated environments to avoid conflicts and ensure test reliability. Ephemeral namespaces provide clean, isolated environments for each test run, preventing test interference and state pollution. This guide demonstrates how to build Tekton pipelines that create temporary namespaces, deploy applications, run integration tests, and clean up automatically.

## Understanding Ephemeral Namespaces

Ephemeral namespaces are temporary Kubernetes namespaces created for a specific purpose and deleted after use. They provide complete isolation between test runs, allow parallel testing without conflicts, and ensure clean state for each test. For CI/CD, this means reliable, reproducible integration tests that can run concurrently.

## Setting Up Prerequisites

Ensure your Tekton installation has necessary permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-test-runner
  namespace: tekton-pipelines

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tekton-namespace-manager
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["create", "delete", "get", "list"]
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "secrets"]
    verbs: ["*"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-test-runner-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-namespace-manager
subjects:
  - kind: ServiceAccount
    name: tekton-test-runner
    namespace: tekton-pipelines
```

## Creating a Namespace Provisioning Task

Build a task to create ephemeral namespaces:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: create-ephemeral-namespace
spec:
  params:
    - name: namespace-prefix
      type: string
      default: "test"
    - name: labels
      type: string
      default: "purpose=integration-test,managed-by=tekton"

  results:
    - name: namespace-name
      description: The created namespace name

  steps:
    - name: create-namespace
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        # Generate unique namespace name
        TIMESTAMP=$(date +%s)
        RANDOM_ID=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 6 | head -n 1)
        NAMESPACE="$(params.namespace-prefix)-${TIMESTAMP}-${RANDOM_ID}"

        echo "Creating namespace: $NAMESPACE"

        # Create namespace with labels
        cat <<EOF | kubectl apply -f -
        apiVersion: v1
        kind: Namespace
        metadata:
          name: $NAMESPACE
          labels:
            $(params.labels)
            created-at: "$TIMESTAMP"
        EOF

        # Wait for namespace to be active
        kubectl wait --for=jsonpath='{.status.phase}'=Active namespace/$NAMESPACE --timeout=30s

        # Set resource quotas
        cat <<EOF | kubectl apply -f -
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: test-quota
          namespace: $NAMESPACE
        spec:
          hard:
            requests.cpu: "4"
            requests.memory: "8Gi"
            limits.cpu: "8"
            limits.memory: "16Gi"
            pods: "20"
        EOF

        # Output namespace name
        echo -n "$NAMESPACE" | tee $(results.namespace-name.path)
```

## Creating a Cleanup Task

Build a task to delete ephemeral namespaces:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: delete-ephemeral-namespace
spec:
  params:
    - name: namespace-name
      type: string

  steps:
    - name: delete-namespace
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        NAMESPACE="$(params.namespace-name)"

        if [ -z "$NAMESPACE" ]; then
          echo "No namespace specified"
          exit 0
        fi

        echo "Deleting namespace: $NAMESPACE"

        # Delete namespace
        kubectl delete namespace "$NAMESPACE" --timeout=120s || {
          echo "Warning: Failed to delete namespace $NAMESPACE"
          # Force delete if stuck
          kubectl delete namespace "$NAMESPACE" --grace-period=0 --force || true
        }

        echo "Namespace $NAMESPACE deleted"
```

## Building the Integration Test Pipeline

Create a complete pipeline with ephemeral namespace lifecycle:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: integration-test-ephemeral
spec:
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: main
    - name: image-name
      type: string

  workspaces:
    - name: source-workspace

  tasks:
    - name: clone-repo
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: source-workspace

    - name: build-image
      runAfter: [clone-repo]
      taskRef:
        name: kaniko
      params:
        - name: IMAGE
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: source-workspace

    - name: create-test-namespace
      runAfter: [build-image]
      taskRef:
        name: create-ephemeral-namespace
      params:
        - name: namespace-prefix
          value: "integration-test"

    - name: deploy-application
      runAfter: [create-test-namespace]
      taskRef:
        name: deploy-to-namespace
      params:
        - name: namespace
          value: $(tasks.create-test-namespace.results.namespace-name)
        - name: image
          value: $(params.image-name)
      workspaces:
        - name: manifests
          workspace: source-workspace

    - name: wait-for-ready
      runAfter: [deploy-application]
      taskRef:
        name: wait-for-deployment
      params:
        - name: namespace
          value: $(tasks.create-test-namespace.results.namespace-name)
        - name: deployment-name
          value: myapp

    - name: run-integration-tests
      runAfter: [wait-for-ready]
      taskRef:
        name: run-tests
      params:
        - name: namespace
          value: $(tasks.create-test-namespace.results.namespace-name)
        - name: test-service-url
          value: "http://myapp.$(tasks.create-test-namespace.results.namespace-name).svc.cluster.local:8080"
      workspaces:
        - name: source
          workspace: source-workspace

  finally:
    - name: cleanup-namespace
      taskRef:
        name: delete-ephemeral-namespace
      params:
        - name: namespace-name
          value: $(tasks.create-test-namespace.results.namespace-name)

    - name: report-results
      taskRef:
        name: send-notification
      params:
        - name: test-status
          value: $(tasks.run-integration-tests.status)
        - name: namespace
          value: $(tasks.create-test-namespace.results.namespace-name)
```

## Creating the Deployment Task

Deploy application to the ephemeral namespace:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: deploy-to-namespace
spec:
  params:
    - name: namespace
      type: string
    - name: image
      type: string

  workspaces:
    - name: manifests

  steps:
    - name: deploy
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        NAMESPACE="$(params.namespace)"
        IMAGE="$(params.image)"

        echo "Deploying to namespace: $NAMESPACE"

        # Create deployment
        cat <<EOF | kubectl apply -n $NAMESPACE -f -
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: myapp
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: myapp
          template:
            metadata:
              labels:
                app: myapp
            spec:
              containers:
              - name: myapp
                image: $IMAGE
                ports:
                - containerPort: 8080
                env:
                - name: ENVIRONMENT
                  value: "test"
                readinessProbe:
                  httpGet:
                    path: /health
                    port: 8080
                  initialDelaySeconds: 5
                  periodSeconds: 5
        ---
        apiVersion: v1
        kind: Service
        metadata:
          name: myapp
        spec:
          selector:
            app: myapp
          ports:
          - port: 8080
            targetPort: 8080
        EOF

        # Apply additional manifests
        if [ -d "$(workspaces.manifests.path)/k8s/test" ]; then
          kubectl apply -n $NAMESPACE -f $(workspaces.manifests.path)/k8s/test/
        fi

        echo "Deployment complete"
```

## Creating the Test Execution Task

Run integration tests against deployed application:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: run-tests
spec:
  params:
    - name: namespace
      type: string
    - name: test-service-url
      type: string

  workspaces:
    - name: source

  steps:
    - name: run-tests
      image: node:18
      script: |
        #!/bin/bash
        set -e

        cd $(workspaces.source.path)

        echo "Running integration tests against $(params.test-service-url)"

        # Set test environment variables
        export TEST_URL="$(params.test-service-url)"
        export TEST_NAMESPACE="$(params.namespace)"

        # Run tests
        npm install
        npm run test:integration

        echo "Tests completed successfully"

    - name: collect-logs
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash

        NAMESPACE="$(params.namespace)"

        echo "Collecting logs from namespace: $NAMESPACE"

        # Get logs from all pods
        for pod in $(kubectl get pods -n $NAMESPACE -o name); do
          echo "=== Logs from $pod ==="
          kubectl logs -n $NAMESPACE $pod --tail=100 || true
        done
      when:
        - input: "$(tasks.status)"
          operator: in
          values: ["Failed", "Error"]
```

## Implementing Parallel Test Execution

Run multiple test suites in parallel using separate namespaces:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: parallel-integration-tests
spec:
  params:
    - name: git-url
      type: string
    - name: image-name
      type: string

  workspaces:
    - name: source-workspace

  tasks:
    - name: clone-and-build
      taskRef:
        name: build-image
      params:
        - name: git-url
          value: $(params.git-url)
        - name: image
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: source-workspace

    # API tests
    - name: api-test-namespace
      runAfter: [clone-and-build]
      taskRef:
        name: create-ephemeral-namespace
      params:
        - name: namespace-prefix
          value: "api-test"

    - name: api-tests
      runAfter: [api-test-namespace]
      taskRef:
        name: run-test-suite
      params:
        - name: namespace
          value: $(tasks.api-test-namespace.results.namespace-name)
        - name: test-suite
          value: "api"
        - name: image
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: source-workspace

    # UI tests
    - name: ui-test-namespace
      runAfter: [clone-and-build]
      taskRef:
        name: create-ephemeral-namespace
      params:
        - name: namespace-prefix
          value: "ui-test"

    - name: ui-tests
      runAfter: [ui-test-namespace]
      taskRef:
        name: run-test-suite
      params:
        - name: namespace
          value: $(tasks.ui-test-namespace.results.namespace-name)
        - name: test-suite
          value: "ui"
        - name: image
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: source-workspace

    # Database tests
    - name: db-test-namespace
      runAfter: [clone-and-build]
      taskRef:
        name: create-ephemeral-namespace
      params:
        - name: namespace-prefix
          value: "db-test"

    - name: db-tests
      runAfter: [db-test-namespace]
      taskRef:
        name: run-test-suite
      params:
        - name: namespace
          value: $(tasks.db-test-namespace.results.namespace-name)
        - name: test-suite
          value: "database"
        - name: image
          value: $(params.image-name)
      workspaces:
        - name: source
          workspace: source-workspace

  finally:
    - name: cleanup-api-ns
      taskRef:
        name: delete-ephemeral-namespace
      params:
        - name: namespace-name
          value: $(tasks.api-test-namespace.results.namespace-name)

    - name: cleanup-ui-ns
      taskRef:
        name: delete-ephemeral-namespace
      params:
        - name: namespace-name
          value: $(tasks.ui-test-namespace.results.namespace-name)

    - name: cleanup-db-ns
      taskRef:
        name: delete-ephemeral-namespace
      params:
        - name: namespace-name
          value: $(tasks.db-test-namespace.results.namespace-name)
```

## Adding Database Fixtures

Deploy test databases in ephemeral namespaces:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: setup-test-database
spec:
  params:
    - name: namespace
      type: string

  steps:
    - name: deploy-postgres
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash
        set -e

        NAMESPACE="$(params.namespace)"

        cat <<EOF | kubectl apply -n $NAMESPACE -f -
        apiVersion: apps/v1
        kind: StatefulSet
        metadata:
          name: postgres
        spec:
          serviceName: postgres
          replicas: 1
          selector:
            matchLabels:
              app: postgres
          template:
            metadata:
              labels:
                app: postgres
            spec:
              containers:
              - name: postgres
                image: postgres:15
                env:
                - name: POSTGRES_DB
                  value: testdb
                - name: POSTGRES_USER
                  value: testuser
                - name: POSTGRES_PASSWORD
                  value: testpass
                ports:
                - containerPort: 5432
                readinessProbe:
                  exec:
                    command:
                    - pg_isready
                    - -U
                    - testuser
                  initialDelaySeconds: 5
                  periodSeconds: 5
        ---
        apiVersion: v1
        kind: Service
        metadata:
          name: postgres
        spec:
          selector:
            app: postgres
          ports:
          - port: 5432
        EOF

        # Wait for database to be ready
        kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=120s

    - name: load-fixtures
      image: postgres:15
      script: |
        #!/bin/bash
        set -e

        NAMESPACE="$(params.namespace)"

        # Wait for service DNS to propagate
        sleep 5

        # Load test data
        PGPASSWORD=testpass psql -h postgres.$NAMESPACE.svc.cluster.local -U testuser -d testdb <<'EOSQL'
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50),
          email VARCHAR(100)
        );

        INSERT INTO users (username, email) VALUES
          ('testuser1', 'test1@example.com'),
          ('testuser2', 'test2@example.com');
        EOSQL

        echo "Test fixtures loaded"
```

## Monitoring and Debugging

Add debugging capabilities:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: debug-namespace
spec:
  params:
    - name: namespace
      type: string

  steps:
    - name: show-namespace-state
      image: bitnami/kubectl:latest
      script: |
        #!/bin/bash

        NAMESPACE="$(params.namespace)"

        echo "=== Namespace: $NAMESPACE ==="
        kubectl describe namespace $NAMESPACE

        echo "=== Pods ==="
        kubectl get pods -n $NAMESPACE -o wide

        echo "=== Services ==="
        kubectl get services -n $NAMESPACE

        echo "=== Events ==="
        kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'
```

## Conclusion

Ephemeral Kubernetes namespaces provide reliable, isolated environments for integration testing in Tekton pipelines. By automating namespace creation, application deployment, test execution, and cleanup, you create a robust testing system that prevents test interference and enables parallel execution. This approach scales well, provides consistent results, and integrates seamlessly with CI/CD workflows. The automatic cleanup ensures no resource waste, while the isolation guarantees that each test run starts with a clean state.
