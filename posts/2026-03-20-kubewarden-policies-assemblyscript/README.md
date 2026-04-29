# How to Write Custom Kubewarden Policies in AssemblyScript - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, AssemblyScript, TypeScript, Policy as Code, Kubernetes, WebAssembly, Admission Control

Description: Learn how to write custom Kubewarden admission policies in AssemblyScript - a TypeScript-like language that compiles to WebAssembly - for familiar JavaScript-style policy authoring.

---

AssemblyScript allows developers familiar with TypeScript to experiment with Kubewarden policies without learning Rust or Go. It compiles to WebAssembly, but Kubewarden does not currently provide an official AssemblyScript SDK or scaffolding tool, so you work against the low-level waPC policy interface directly.

---

## Prerequisites

```bash
# Install Node.js 18+ and git

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash
sudo apt-get install -y nodejs git
```

---

## Step 1: Create a Policy Project

```bash
# Use Kubewarden's archived AssemblyScript example as a starting point
git clone --depth 1 --branch assemblyscript-implementation \
  https://github.com/kubewarden/pod-privileged-policy my-policy

cd my-policy
npm install
```

---

## Step 2: Write the Policy Logic

Edit `assembly/index.ts` to implement your policy using Kubewarden's waPC entrypoints:

```typescript
// assembly/index.ts
import { JSON, JSONEncoder } from "assemblyscript-json";
import { handleAbort, handleCall, register } from "@wapc/as-guest";

function acceptRequest(): string {
  let encoder = new JSONEncoder();
  encoder.pushObject("");
  encoder.setBoolean("accepted", true);
  encoder.setString("message", "");
  encoder.popObject();
  return encoder.toString();
}

function rejectRequest(message: string): string {
  let encoder = new JSONEncoder();
  encoder.pushObject("");
  encoder.setBoolean("accepted", false);
  encoder.setString("message", message);
  encoder.popObject();
  return encoder.toString();
}

function validateSettings(): string {
  let encoder = new JSONEncoder();
  encoder.pushObject("");
  encoder.setBoolean("valid", true);
  encoder.popObject();
  return encoder.toString();
}

function getContainerName(container: JSON.Obj): string {
  if (!container.has("name")) {
    return "unknown";
  }

  let containerName = container.get("name") as JSON.Str;
  return containerName._str;
}

function validateRequest(payload: ArrayBuffer): string {
  let validationRequest = JSON.parse(String.UTF8.decode(payload, false)) as JSON.Obj;
  if (!validationRequest.has("request")) {
    return acceptRequest();
  }

  let request = validationRequest.get("request") as JSON.Obj;
  if (!request.has("object")) {
    return acceptRequest();
  }

  let object = request.get("object") as JSON.Obj;
  if (!object.has("spec")) {
    return acceptRequest();
  }

  let spec = object.get("spec") as JSON.Obj;
  if (!spec.has("containers")) {
    return acceptRequest();
  }

  let containers = spec.get("containers") as JSON.Arr;
  let violations = new Array<string>();

  for (let i = 0; i < containers._arr.length; i++) {
    let container = containers._arr[i] as JSON.Obj;
    let containerName = getContainerName(container);

    if (!container.has("securityContext")) {
      violations.push("Container '" + containerName + "' must have a securityContext");
      continue;
    }

    let securityContext = container.get("securityContext") as JSON.Obj;
    if (!securityContext.has("runAsNonRoot")) {
      violations.push("Container '" + containerName + "' must set runAsNonRoot: true");
      continue;
    }

    let runAsNonRoot = securityContext.get("runAsNonRoot") as JSON.Bool;
    if (!runAsNonRoot._bool) {
      violations.push("Container '" + containerName + "' must set runAsNonRoot: true");
    }
  }

  if (violations.length > 0) {
    return rejectRequest(violations.join("; "));
  }

  return acceptRequest();
}

register("validate", function (payload: ArrayBuffer): ArrayBuffer {
  return String.UTF8.encode(validateRequest(payload));
});

register("validate_settings", function (_payload: ArrayBuffer): ArrayBuffer {
  return String.UTF8.encode(validateSettings());
});

register("protocol_version", function (_payload: ArrayBuffer): ArrayBuffer {
  return String.UTF8.encode('"v1"');
});

export function __guest_call(operation_size: usize, payload_size: usize): bool {
  return handleCall(operation_size, payload_size);
}

function abort(
  message: string | null,
  fileName: string | null,
  lineNumber: u32,
  columnNumber: u32,
): void {
  handleAbort(message, fileName, lineNumber, columnNumber);
}
```

---

## Step 3: Build the WASM Policy

```bash
# Compile to WASM
npm run asbuild

# The optimized WASM file is generated at:
ls build/optimized.wasm
```

---

## Step 4: Test Locally

```bash
# Install kwctl
curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
unzip kwctl-linux-x86_64.zip
chmod +x kwctl-linux-x86_64 && sudo mv kwctl-linux-x86_64 /usr/local/bin/kwctl

# Create a test admission request (pod without securityContext)
cat > request-short.json << EOF
{
  "uid": "1299d386-525b-4032-98ae-1949f69f9cfc",
  "kind": {
    "group": "",
    "version": "v1",
    "kind": "Pod"
  },
  "resource": {
    "group": "",
    "version": "v1",
    "resource": "pods"
  },
  "requestKind": {
    "group": "",
    "version": "v1",
    "kind": "Pod"
  },
  "requestResource": {
    "group": "",
    "version": "v1",
    "resource": "pods"
  },
  "name": "app",
  "namespace": "default",
  "operation": "CREATE",
  "userInfo": {
    "username": "kubernetes-admin",
    "groups": ["system:masters", "system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {
      "name": "app",
      "namespace": "default"
    },
    "spec": {
      "containers": [
        {
          "name": "app",
          "image": "nginx:1.24"
        }
      ]
    }
  },
  "oldObject": null,
  "dryRun": false,
  "options": {
    "kind": "CreateOptions",
    "apiVersion": "meta.k8s.io/v1"
  }
}
EOF

# Run the policy test
kwctl run build/optimized.wasm --request-path request-short.json
# Expected: rejected - container 'app' is missing a securityContext
```

---

## Step 5: Annotate and Deploy

```bash
# Update metadata.yml so its annotations and rules match your policy, then annotate it
kwctl annotate build/optimized.wasm \
  --metadata-path metadata.yml \
  --output-path annotated-policy.wasm

# Push to a registry
kwctl push annotated-policy.wasm \
  ghcr.io/my-org/require-non-root:v0.1.0

# Deploy via Kubewarden
kubectl apply -f - <<EOF
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-non-root
spec:
  module: registry://ghcr.io/my-org/require-non-root:v0.1.0
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE"]
  mutating: false
EOF
```

---

## Best Practices

- AssemblyScript's JSON handling requires careful null checking - always handle missing fields when reading JSON.
- Write tests using the AssemblyScript test runner before compiling to WASM.
- For new production policies, prefer Kubewarden's supported Go, Rust, or JavaScript/TypeScript SDKs; Kubewarden does not currently ship an official AssemblyScript SDK.
