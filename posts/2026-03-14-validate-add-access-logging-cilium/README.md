# Validating Access Logging in Cilium Network Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Network Security, Validation, Access Logging, Testing, Compliance

Description: Validate that access logging in Cilium L7 parsers captures all required events with correct metadata, proper data redaction, and complete coverage of both allowed and denied traffic flows.

---

## Introduction

Validating access logging ensures that every security-relevant event is captured accurately. Incomplete or inaccurate access logs undermine security monitoring, compliance reporting, and incident investigation. Validation must confirm that both allowed and denied requests generate log entries, that metadata is correct, and that sensitive data is properly redacted.

This guide provides a testing framework for validating access logging completeness, correctness, and compliance in Cilium L7 parsers.

## Prerequisites

- Parser with access logging implemented
- Go 1.21 or later
- Test Kubernetes cluster with Cilium and Hubble
- Compliance requirements documentation (if applicable)
- Understanding of your protocol's security-relevant events

## Testing Log Entry Completeness

Every code path through OnData that makes a policy decision must generate a log entry:

```go
func TestAccessLogCompleteness(t *testing.T) {
    tests := []struct {
        name           string
        input          []byte
        expectedType   cilium.EntryType
        expectLog      bool
        desc           string
    }{
        {
            name:           "allowed request logged",
            input:          makeMessage(0x01, []byte("test")),
            expectedType:   cilium.EntryType_Request,
            expectLog:      true,
            desc:           "Allowed requests must be logged as request entries",
        },
        {
            name:           "denied request logged",
            input:          makeMessage(0xFF, []byte("test")),  // Denied command
            expectedType:   cilium.EntryType_Denied,
            expectLog:      true,
            desc:           "Denied requests must be logged as denied entries",
        },
        {
            name:           "partial data not logged",
            input:          []byte{0x00, 0x00},  // Incomplete header
            expectLog:      false,
            desc:           "Incomplete data should not generate a log entry",
        },
        {
            name:           "malformed data logged as error",
            input:          []byte{0xFF, 0xFF, 0xFF, 0xFF},  // Invalid length
            expectedType:   cilium.EntryType_Denied,
            expectLog:      true,
            desc:           "Malformed messages should be logged before the parser returns ERROR",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create parser with a mock log collector
            collector := &mockLogCollector{}
            parser := newTestParser(collector)
            reader := proxylib.NewReader([][]byte{tt.input}, false)

            parser.OnData(false, &reader)

            if tt.expectLog && len(collector.entries) == 0 {
                t.Errorf("%s: expected log entry but none generated", tt.desc)
            }
            if !tt.expectLog && len(collector.entries) > 0 {
                t.Errorf("%s: unexpected log entry generated", tt.desc)
            }
            if tt.expectLog && len(collector.entries) > 0 {
                if collector.entries[0].EntryType != tt.expectedType {
                    t.Errorf("EntryType: got %v, want %v", collector.entries[0].EntryType, tt.expectedType)
                }
            }
        })
    }
}

type mockLogCollector struct {
    entries []*cilium.LogEntry
}

func (m *mockLogCollector) Log(entry *cilium.LogEntry) {
    m.entries = append(m.entries, entry)
}
```

## Validating Metadata Correctness

Verify that each field in the log entry is populated correctly:

```go
func TestAccessLogMetadata(t *testing.T) {
    collector := &mockLogCollector{}
    parser := newTestParserWithConnection(collector, &proxylib.Connection{
        SrcId:    100,
        DstId:    200,
        SrcAddr:  "10.0.1.5:43210",
        DstAddr:  "10.0.2.10:9000",
    })

    msg := makeMessage(0x01, []byte("testkey"))
    reader := proxylib.NewReader([][]byte{msg}, false)
    parser.OnData(false, &reader)

    if len(collector.entries) != 1 {
        t.Fatalf("Expected 1 log entry, got %d", len(collector.entries))
    }

    entry := collector.entries[0]

    // Verify all required fields are present
    checks := []struct {
        field string
        got   interface{}
        want  interface{}
    }{
        {"EntryType", entry.EntryType, cilium.EntryType_Request},
        {"SourceSecurityId", entry.SourceSecurityId, uint32(100)},
        {"DestinationSecurityId", entry.DestinationSecurityId, uint32(200)},
        {"SourceAddress", entry.SourceAddress, "10.0.1.5:43210"},
        {"DestinationAddress", entry.DestinationAddress, "10.0.2.10:9000"},
    }

    for _, check := range checks {
        if !reflect.DeepEqual(check.got, check.want) {
            t.Errorf("%s: got %v, want %v", check.field, check.got, check.want)
        }
    }

    generic := entry.GetGenericL7()
    if generic == nil {
        t.Fatal("Generic L7 log entry is nil")
    }

    if generic.Proto != "myprotocol" {
        t.Errorf("Protocol: got %q, want %q", generic.Proto, "myprotocol")
    }

    // Verify L7 fields
    if generic.Fields["command"] == "" {
        t.Error("L7 command field is empty")
    }
    if generic.Fields["request_id"] == "" {
        t.Error("L7 request_id field is empty")
    }

    // Verify timestamp is valid
    if entry.Timestamp == 0 {
        t.Error("Timestamp is empty")
    }
}
```

```mermaid
flowchart TD
    A[Log Entry Validation] --> B[Completeness]
    A --> C[Metadata Correctness]
    A --> D[Redaction Verification]
    A --> E[Direction Accuracy]

    B --> B1[Allowed requests logged?]
    B --> B2[Denied requests logged?]
    B --> B3[Error cases logged?]

    C --> C1[Identities correct?]
    C --> C2[Endpoints correct?]
    C --> C3[Timestamps valid?]

    D --> D1[Passwords redacted?]
    D --> D2[Tokens redacted?]
    D --> D3[Bodies truncated?]

    E --> E1[Requests typed correctly?]
    E --> E2[Responses typed correctly?]
```

## Validating Data Redaction

Ensure sensitive data never appears in logs:

```go
func TestAccessLogRedaction(t *testing.T) {
    collector := &mockLogCollector{}
    parser := newTestParser(collector)

    sensitiveInputs := []struct {
        name    string
        command byte
        payload []byte
    }{
        {"auth with password", 0x10, []byte("user:secretpassword123")},
        {"token auth", 0x11, []byte("Bearer eyJhbGciOiJIUzI1NiJ9.test")},
        {"key with secret value", 0x02, []byte("api_key=sk_live_abc123")},
    }

    for _, si := range sensitiveInputs {
        t.Run(si.name, func(t *testing.T) {
            collector.entries = nil
            msg := makeMessage(si.command, si.payload)
            reader := proxylib.NewReader([][]byte{msg}, false)
            parser.OnData(false, &reader)

            for _, entry := range collector.entries {
                entryJSON, _ := json.Marshal(entry)
                entryStr := string(entryJSON)

                // Check that sensitive payload content is not in the log
                if strings.Contains(entryStr, "secretpassword") {
                    t.Error("Password found in log entry")
                }
                if strings.Contains(entryStr, "eyJhbGciOiJIUzI1NiJ9") {
                    t.Error("JWT token found in log entry")
                }
                if strings.Contains(entryStr, "sk_live_abc123") {
                    t.Error("API key found in log entry")
                }
            }
        })
    }
}
```

## End-to-End Log Validation

Validate the complete logging pipeline in a cluster:

```bash
# Send known traffic

kubectl exec test-client -- protocol-client send --command GET --key "test1" --target myservice:9000
kubectl exec test-client -- protocol-client send --command DELETE --key "test2" --target myservice:9000

# Collect Hubble L7 flows
hubble observe --type l7 --last 10 -o json > /tmp/flows.json

# Validate flow count
FLOW_COUNT=$(jq -s 'length' /tmp/flows.json)
echo "Captured $FLOW_COUNT flows"

# Validate verdicts and generic L7 protocol names
jq -r '.flow.verdict' /tmp/flows.json | sort | uniq -c
jq -r 'select(.flow.l7.generic_l7.proto == "myprotocol") | .flow.l7.generic_l7.fields[]?' /tmp/flows.json
```

## Verification

Run the complete validation suite:

```bash
# Completeness tests
go test ./proxylib/myprotocol/... -v -run TestAccessLogCompleteness

# Metadata correctness tests
go test ./proxylib/myprotocol/... -v -run TestAccessLogMetadata

# Redaction tests
go test ./proxylib/myprotocol/... -v -run TestAccessLogRedaction

# Full suite with race detection
go test ./proxylib/myprotocol/... -race -v -count=1

# Coverage of logging code
go test ./proxylib/myprotocol/... -coverprofile=cover.out
go tool cover -func=cover.out | grep -i "log"
```

## Troubleshooting

**Problem: Mock collector does not capture entries**
Ensure the parser is configured to use the mock collector in tests rather than the real accesslog package. Use dependency injection to make the logging sink configurable.

**Problem: Redaction tests pass but production logs show sensitive data**
The test may be checking different code paths than production. Ensure the sanitization function is called on all paths, not just the ones covered by tests.

**Problem: End-to-end validation shows inconsistent flow counts**
Hubble may aggregate or deduplicate flows. Use unique request IDs and check for each specific ID rather than relying on total counts.

**Problem: Timestamps are not in UTC**
Proxylib access-log entries use a Unix-nanosecond timestamp set by `Connection.Log`. If you add any protocol-specific timestamp fields to the generic L7 map, format them from `time.Now().UTC()` so they are consistent across nodes.

## Conclusion

Validating access logging requires testing completeness (all decisions logged), correctness (all metadata accurate), redaction (no sensitive data), and end-to-end delivery (logs reach Hubble). Each dimension needs dedicated tests that fail explicitly when the logging contract is violated. These validations should run in CI to prevent logging regressions that could create security monitoring blind spots.
