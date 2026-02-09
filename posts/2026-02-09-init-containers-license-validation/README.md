# How to Use Init Containers for License Validation Before Application Startup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Security

Description: Learn how to implement init containers that validate software licenses, check entitlements, and verify compliance before allowing your application to start.

---

Commercial software often requires license validation before starting. Init containers provide an ideal mechanism for performing license checks, verifying entitlements, and ensuring compliance before your application begins serving requests. This prevents unlicensed software from running while keeping validation logic separate from application code.

License validation in init containers ensures that applications only start if they have valid, unexpired licenses. This is particularly important for commercial software deployments, enterprise applications with seat-based licensing, or services that require feature entitlement checks.

## Understanding License Validation Patterns

License validation typically involves checking license files, validating signatures, verifying expiration dates, and sometimes contacting license servers for online validation. Init containers handle these checks before the main application starts, ensuring licensing requirements are met.

The init container pattern is superior to embedding license checks in the application because it enforces validation at the infrastructure level. Even if application code is modified to skip checks, the init container must pass before Kubernetes starts the application.

This approach also centralizes license management. You can update validation logic, change license servers, or modify entitlement rules without rebuilding application containers.

## Basic License File Validation

Start with a simple pattern that validates a license file's signature and expiration date.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: application-license
  namespace: default
type: Opaque
stringData:
  license.key: |
    -----BEGIN LICENSE-----
    Product: MyApp Enterprise
    License Type: Commercial
    Licensed To: Acme Corporation
    Seats: 100
    Expiration: 2026-12-31
    Features: advanced-analytics,premium-support,api-access
    Signature: 3q2+7w==...base64_signature...==
    -----END LICENSE-----
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: license-validator-script
  namespace: default
data:
  validate.sh: |
    #!/bin/sh
    set -e

    LICENSE_FILE="/license/license.key"
    PUBLIC_KEY="/keys/public.pem"

    echo "Validating license..."

    # Check license file exists
    if [ ! -f "$LICENSE_FILE" ]; then
      echo "ERROR: License file not found"
      exit 1
    fi

    # Extract license data
    LICENSE_DATA=$(sed -n '/-----BEGIN LICENSE-----/,/Signature:/p' "$LICENSE_FILE" | grep -v "BEGIN\|Signature")

    # Extract signature
    SIGNATURE=$(grep "Signature:" "$LICENSE_FILE" | cut -d' ' -f2)

    # Verify signature
    echo "$LICENSE_DATA" | openssl dgst -sha256 -verify "$PUBLIC_KEY" -signature <(echo "$SIGNATURE" | base64 -d) || {
      echo "ERROR: License signature invalid"
      exit 1
    }

    echo "License signature verified"

    # Check expiration date
    EXPIRATION=$(grep "Expiration:" "$LICENSE_FILE" | cut -d' ' -f2)
    EXPIRATION_TS=$(date -d "$EXPIRATION" +%s)
    CURRENT_TS=$(date +%s)

    if [ $CURRENT_TS -gt $EXPIRATION_TS ]; then
      echo "ERROR: License expired on $EXPIRATION"
      exit 1
    fi

    DAYS_REMAINING=$(( ($EXPIRATION_TS - $CURRENT_TS) / 86400 ))
    echo "License valid for $DAYS_REMAINING days"

    # Warn if expiring soon
    if [ $DAYS_REMAINING -lt 30 ]; then
      echo "WARNING: License expires in $DAYS_REMAINING days"
    fi

    # Extract and validate licensed features
    FEATURES=$(grep "Features:" "$LICENSE_FILE" | cut -d' ' -f2-)
    echo "Licensed features: $FEATURES"

    # Save license info for application
    cat > /shared/license-info.json << EOF
    {
      "valid": true,
      "expires": "$EXPIRATION",
      "days_remaining": $DAYS_REMAINING,
      "features": "$FEATURES",
      "validated_at": "$(date -Iseconds)"
    }
    EOF

    echo "License validation successful"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: licensed-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: licensed-app
  template:
    metadata:
      labels:
        app: licensed-app
    spec:
      initContainers:
      - name: license-validator
        image: alpine:3.18
        command:
        - sh
        - /scripts/validate.sh
        volumeMounts:
        - name: license
          mountPath: /license
          readOnly: true
        - name: public-key
          mountPath: /keys
          readOnly: true
        - name: validator-script
          mountPath: /scripts
        - name: shared-data
          mountPath: /shared

      containers:
      - name: app
        image: myorg/commercial-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: LICENSE_INFO_FILE
          value: "/shared/license-info.json"
        volumeMounts:
        - name: shared-data
          mountPath: /shared
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: license
        secret:
          secretName: application-license
      - name: public-key
        secret:
          secretName: license-public-key
      - name: validator-script
        configMap:
          name: license-validator-script
          defaultMode: 0755
      - name: shared-data
        emptyDir: {}
```

This init container validates the license signature using the vendor's public key, checks expiration, and creates a summary file that the application can reference.

## Online License Server Validation

For more sophisticated licensing, validate against a license server.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: online-license-validator
  namespace: default
data:
  validate-online.py: |
    #!/usr/bin/env python3
    import json
    import sys
    import requests
    import os
    from datetime import datetime

    LICENSE_SERVER = os.environ.get('LICENSE_SERVER')
    LICENSE_KEY = os.environ.get('LICENSE_KEY')
    PRODUCT_ID = os.environ.get('PRODUCT_ID')
    POD_NAME = os.environ.get('POD_NAME')

    def validate_license():
        print(f"Validating license with server: {LICENSE_SERVER}")

        try:
            response = requests.post(
                f"{LICENSE_SERVER}/v1/validate",
                json={
                    "license_key": LICENSE_KEY,
                    "product_id": PRODUCT_ID,
                    "instance_id": POD_NAME
                },
                timeout=30
            )

            if response.status_code != 200:
                print(f"ERROR: License validation failed: HTTP {response.status_code}")
                print(response.text)
                return False

            data = response.json()

            if not data.get('valid'):
                print(f"ERROR: License invalid: {data.get('reason')}")
                return False

            print(f"License validated successfully")
            print(f"Licensed to: {data.get('customer_name')}")
            print(f"License type: {data.get('license_type')}")
            print(f"Expires: {data.get('expiration_date')}")
            print(f"Seats available: {data.get('seats_available')}/{data.get('seats_total')}")

            # Check if seats are available
            if data.get('seats_available', 0) <= 0:
                print("ERROR: No license seats available")
                return False

            # Save license info
            license_info = {
                "valid": True,
                "customer": data.get('customer_name'),
                "license_type": data.get('license_type'),
                "expiration": data.get('expiration_date'),
                "seats_available": data.get('seats_available'),
                "features": data.get('features', []),
                "validated_at": datetime.utcnow().isoformat()
            }

            with open('/shared/license-info.json', 'w') as f:
                json.dump(license_info, f, indent=2)

            print("License information saved")
            return True

        except requests.exceptions.Timeout:
            print("ERROR: License server timeout")
            return False
        except Exception as e:
            print(f"ERROR: License validation failed: {str(e)}")
            return False

    if __name__ == '__main__':
        if validate_license():
            sys.exit(0)
        else:
            sys.exit(1)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: online-licensed-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: online-licensed
  template:
    metadata:
      labels:
        app: online-licensed
    spec:
      initContainers:
      - name: online-license-check
        image: python:3.11-slim
        command:
        - sh
        - -c
        - |
          pip install requests --quiet
          python /scripts/validate-online.py
        env:
        - name: LICENSE_SERVER
          value: "https://license.vendor.com"
        - name: LICENSE_KEY
          valueFrom:
            secretKeyRef:
              name: product-license
              key: license-key
        - name: PRODUCT_ID
          value: "enterprise-edition"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: validator-script
          mountPath: /scripts
        - name: shared-data
          mountPath: /shared

      containers:
      - name: app
        image: myorg/enterprise-app:v2.0.0
        ports:
        - containerPort: 8080
        env:
        - name: LICENSE_INFO_FILE
          value: "/shared/license-info.json"
        volumeMounts:
        - name: shared-data
          mountPath: /shared
          readOnly: true
        lifecycle:
          preStop:
            exec:
              command:
              - sh
              - -c
              - |
                # Release license seat on shutdown
                curl -X POST "${LICENSE_SERVER}/v1/release" \
                  -H "Content-Type: application/json" \
                  -d "{\"license_key\":\"${LICENSE_KEY}\",\"instance_id\":\"${POD_NAME}\"}"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: validator-script
        configMap:
          name: online-license-validator
          defaultMode: 0755
      - name: shared-data
        emptyDir: {}
---
apiVersion: v1
kind: Secret
metadata:
  name: product-license
  namespace: default
type: Opaque
stringData:
  license-key: "ENT-2024-ACME-CORP-XYZ123"
```

This validator contacts a license server to check entitlements and seat availability. The preStop hook releases the license seat when the pod terminates.

## Hardware-Based License Validation

Some licenses are tied to hardware identifiers or node characteristics.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hardware-license-validator
  namespace: default
data:
  validate-hardware.sh: |
    #!/bin/sh
    set -e

    echo "Collecting hardware identifiers..."

    # Get node name
    NODE_NAME=${NODE_NAME:-unknown}
    echo "Node: $NODE_NAME"

    # Get CPU count
    CPU_COUNT=$(nproc)
    echo "CPUs: $CPU_COUNT"

    # Get total memory in GB
    TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_MEM_GB=$((TOTAL_MEM_KB / 1024 / 1024))
    echo "Memory: ${TOTAL_MEM_GB}GB"

    # Generate hardware fingerprint
    HARDWARE_ID=$(echo "${NODE_NAME}-${CPU_COUNT}-${TOTAL_MEM_GB}" | sha256sum | cut -d' ' -f1)
    echo "Hardware ID: $HARDWARE_ID"

    # Read license file
    LICENSE_FILE="/license/license.key"

    if [ ! -f "$LICENSE_FILE" ]; then
      echo "ERROR: License file not found"
      exit 1
    fi

    # Extract allowed hardware IDs
    ALLOWED_IDS=$(grep "AllowedHardware:" "$LICENSE_FILE" | cut -d' ' -f2- | tr ',' '\n')

    # Check if current hardware is allowed
    HARDWARE_ALLOWED=false
    for allowed_id in $ALLOWED_IDS; do
      if [ "$HARDWARE_ID" = "$allowed_id" ]; then
        HARDWARE_ALLOWED=true
        break
      fi
    done

    if [ "$HARDWARE_ALLOWED" = "false" ]; then
      echo "ERROR: Hardware not licensed. Hardware ID: $HARDWARE_ID"
      echo "Contact vendor to license this hardware"
      exit 1
    fi

    echo "Hardware validation successful"

    # Check resource limits match license
    MAX_CPUS=$(grep "MaxCPUs:" "$LICENSE_FILE" | awk '{print $2}')
    MAX_MEMORY=$(grep "MaxMemoryGB:" "$LICENSE_FILE" | awk '{print $2}')

    if [ $CPU_COUNT -gt $MAX_CPUS ]; then
      echo "ERROR: CPU count ($CPU_COUNT) exceeds licensed maximum ($MAX_CPUS)"
      exit 1
    fi

    if [ $TOTAL_MEM_GB -gt $MAX_MEMORY ]; then
      echo "ERROR: Memory (${TOTAL_MEM_GB}GB) exceeds licensed maximum (${MAX_MEMORY}GB)"
      exit 1
    fi

    echo "Resource limits validated"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: hardware-licensed-agent
  namespace: default
spec:
  selector:
    matchLabels:
      app: hardware-licensed-agent
  template:
    metadata:
      labels:
        app: hardware-licensed-agent
    spec:
      initContainers:
      - name: hardware-license-check
        image: alpine:3.18
        command:
        - sh
        - /scripts/validate-hardware.sh
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: license
          mountPath: /license
          readOnly: true
        - name: validator-script
          mountPath: /scripts
        securityContext:
          privileged: true

      containers:
      - name: agent
        image: myorg/monitoring-agent:v1.0.0
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"

      volumes:
      - name: license
        secret:
          secretName: hardware-license
      - name: validator-script
        configMap:
          name: hardware-license-validator
          defaultMode: 0755
```

This validator ties licenses to specific hardware, ensuring software only runs on authorized infrastructure.

## Feature Entitlement Checks

Validate that specific features are enabled in the license.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-entitlement-validator
  namespace: default
data:
  check-entitlements.py: |
    #!/usr/bin/env python3
    import json
    import sys

    LICENSE_FILE = "/license/license.key"
    REQUIRED_FEATURES_FILE = "/config/required-features.json"

    def load_license():
        with open(LICENSE_FILE, 'r') as f:
            for line in f:
                if line.startswith('Features:'):
                    features_str = line.split(':', 1)[1].strip()
                    return set(features_str.split(','))
        return set()

    def load_required_features():
        with open(REQUIRED_FEATURES_FILE, 'r') as f:
            data = json.load(f)
            return data.get('required_features', [])

    def main():
        print("Checking feature entitlements...")

        licensed_features = load_license()
        required_features = load_required_features()

        print(f"Licensed features: {', '.join(sorted(licensed_features))}")
        print(f"Required features: {', '.join(required_features)}")

        missing_features = [f for f in required_features if f not in licensed_features]

        if missing_features:
            print(f"ERROR: Missing required features: {', '.join(missing_features)}")
            print("Please upgrade your license to access these features")
            return 1

        print("All required features are licensed")

        # Create feature manifest
        feature_manifest = {
            "licensed_features": list(licensed_features),
            "enabled_features": required_features
        }

        with open('/shared/features.json', 'w') as f:
            json.dump(feature_manifest, f, indent=2)

        return 0

    if __name__ == '__main__':
        sys.exit(main())
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: required-features
  namespace: default
data:
  required-features.json: |
    {
      "required_features": [
        "api-access",
        "advanced-analytics",
        "premium-support",
        "multi-region"
      ]
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-gated-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: feature-gated
  template:
    metadata:
      labels:
        app: feature-gated
    spec:
      initContainers:
      - name: feature-entitlement-check
        image: python:3.11-slim
        command:
        - python
        - /scripts/check-entitlements.py
        volumeMounts:
        - name: license
          mountPath: /license
          readOnly: true
        - name: required-features
          mountPath: /config
          readOnly: true
        - name: validator-script
          mountPath: /scripts
        - name: shared-data
          mountPath: /shared

      containers:
      - name: app
        image: myorg/feature-rich-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: FEATURES_MANIFEST
          value: "/shared/features.json"
        volumeMounts:
        - name: shared-data
          mountPath: /shared
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"

      volumes:
      - name: license
        secret:
          secretName: application-license
      - name: required-features
        configMap:
          name: required-features
      - name: validator-script
        configMap:
          name: feature-entitlement-validator
          defaultMode: 0755
      - name: shared-data
        emptyDir: {}
```

This pattern ensures applications only start if the license includes all required features, preventing unlicensed feature usage.

## License Expiration Monitoring

Set up monitoring to alert on approaching license expiration.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: license-expiration-alerts
  namespace: monitoring
spec:
  groups:
  - name: licensing
    interval: 1h
    rules:
    - alert: LicenseExpiringSoon
      expr: |
        (license_expiration_timestamp - time()) / 86400 < 30
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "License expiring soon"
        description: "License for {{ $labels.product }} expires in {{ $value }} days"

    - alert: LicenseExpired
      expr: |
        license_expiration_timestamp < time()
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "License expired"
        description: "License for {{ $labels.product }} has expired"

    - alert: LicenseSeatsLow
      expr: |
        license_seats_available / license_seats_total < 0.2
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "License seats running low"
        description: "Only {{ $value | humanizePercentage }} of license seats available"
```

These alerts provide advance warning of license issues before they impact production.

## Conclusion

Init containers provide a robust mechanism for validating software licenses before applications start. Whether you need offline license file validation, online server checks, hardware-based licensing, or feature entitlement verification, init containers enforce licensing at the infrastructure level. This approach keeps validation logic separate from application code, enables centralized license management, and ensures compliance without requiring application modifications. Combined with proper monitoring and alerting, init container license validation provides a complete solution for commercial software deployment in Kubernetes.
