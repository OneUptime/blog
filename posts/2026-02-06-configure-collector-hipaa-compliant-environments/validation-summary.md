# Validation Summary: How to Configure the OpenTelemetry Collector for HIPAA-Compliant Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector filter processor
- OTLP receiver and exporter TLS/mTLS configuration
- OpenTelemetry Collector internal telemetry
- HIPAA Security Rule safeguards

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector TLS config documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS FAQ on HIPAA encryption: https://www.hhs.gov/hipaa/for-professionals/faq/2001/is-the-use-of-encryption-mandatory-in-the-security-rule/index.html
- 45 CFR 164.312 Technical safeguards: https://www.law.cornell.edu/cfr/text/45/164.312
- 45 CFR 164.316 Documentation requirements: https://www.law.cornell.edu/cfr/text/45/164.316

## Issues Found
- The transform processor examples used unprefixed OTTL paths such as `attributes["url.path"]` and `body`. Updated them to `span.attributes["url.path"]` and `log.body`, matching the current transform processor documentation for trace and log statements.
- The filter processor examples used deprecated legacy keys (`traces.span` and `logs.log_record`). Updated them to the current `trace_conditions` and `log_conditions` format with `error_mode: ignore`.
- The internal telemetry metrics example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated the example to use a Prometheus pull reader with `host` and `port`.
- The article said HIPAA requires encryption of ePHI in transit and implied a TLS 1.2-specific HIPAA requirement. Updated the wording to reflect that HIPAA encryption specifications are addressable and must be implemented when reasonable and appropriate, or replaced with a documented equivalent alternative.
- The audit log retention wording implied HIPAA requires all Collector logs to be retained for at least six years. Updated it to distinguish log retention from HIPAA's six-year documentation/evidence retention requirements.
- The introduction and "Put It All Together" section overstated the scope by referring to encryption at rest and a complete configuration combining all controls. Narrowed the wording to match what the post actually configures.

## Review Notes
The remaining examples are configuration patterns rather than a complete production HIPAA program. Readers still need a risk analysis, backend storage encryption controls, access management, retention policies, BAAs where applicable, and testing against their exact Collector distribution and version.
