# How to Instrument CPE (Customer Premises Equipment) Provisioning Workflows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CPE, Provisioning, TR-069, Telecommunications

Description: Instrument CPE provisioning workflows including TR-069 ACS interactions with OpenTelemetry for end-to-end visibility.

Customer Premises Equipment provisioning is one of the most common sources of support tickets in telecom. When a customer's router, ONT, or set-top box fails to provision correctly, the result is a truck roll or a frustrated customer on the phone. By instrumenting the provisioning workflow with OpenTelemetry, you can see exactly where things go wrong and reduce the time to resolution.

## CPE Provisioning Flow

A typical CPE provisioning process looks like this:

1. CPE boots up and contacts the ACS (Auto-Configuration Server) via TR-069/CWMP
2. ACS authenticates the device using its serial number or MAC address
3. ACS retrieves the customer's service profile from the BSS/OSS
4. ACS pushes configuration parameters to the CPE (WiFi settings, VoIP credentials, VLAN config)
5. CPE applies the configuration and reports back
6. ACS marks the device as provisioned

Each of these steps can fail, and the failure modes are different. Let's instrument them all.

## Instrumenting the ACS Server

```python
# acs_provisioning.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import time

tracer = trace.get_tracer("cpe.acs")
meter = metrics.get_meter("cpe.acs")

# Provisioning metrics
provision_duration = meter.create_histogram(
    "cpe.provision.duration",
    description="Total time for CPE provisioning workflow",
    unit="ms",
)

provision_counter = meter.create_counter(
    "cpe.provision.count",
    description="Number of provisioning attempts by result",
    unit="{attempt}",
)

provision_step_duration = meter.create_histogram(
    "cpe.provision.step_duration",
    description="Duration of each provisioning step",
    unit="ms",
)

# Track concurrent provisioning sessions
active_sessions = meter.create_up_down_counter(
    "cpe.provision.active_sessions",
    description="Currently active provisioning sessions",
    unit="{session}",
)


def handle_inform(inform_request):
    """Handle a TR-069 Inform from a CPE device."""
    device_serial = inform_request.device_id.serial_number
    device_oui = inform_request.device_id.oui
    event_codes = inform_request.event_codes

    with tracer.start_as_current_span("cpe.inform") as span:
        span.set_attributes({
            "cpe.serial_number": device_serial,
            "cpe.oui": device_oui,
            "cpe.manufacturer": inform_request.device_id.manufacturer,
            "cpe.model": inform_request.device_id.model_name,
            "cpe.firmware_version": inform_request.device_id.firmware_version,
            "cpe.event_codes": ",".join(event_codes),
        })

        # Check if this is a first boot (0 BOOTSTRAP) or a periodic inform
        if "0 BOOTSTRAP" in event_codes:
            return handle_bootstrap(span, inform_request)
        elif "1 BOOT" in event_codes:
            return handle_boot(span, inform_request)
        elif "2 PERIODIC" in event_codes:
            return handle_periodic(span, inform_request)


def handle_bootstrap(parent_span, inform_request):
    """Handle initial provisioning for a new CPE device."""
    device_serial = inform_request.device_id.serial_number
    start_time = time.time()

    active_sessions.add(1)

    try:
        # Step 1: Authenticate device against inventory
        with tracer.start_as_current_span("cpe.provision.authenticate") as auth_span:
            step_start = time.time()
            device_record = lookup_device_in_inventory(device_serial)

            if not device_record:
                auth_span.set_status(StatusCode.ERROR, "Device not in inventory")
                provision_counter.add(1, {"result": "unknown_device"})
                return create_fault_response("Device not registered")

            auth_span.set_attributes({
                "cpe.customer_id": device_record.customer_id,
                "cpe.service_plan": device_record.service_plan,
                "cpe.location_id": device_record.location_id,
            })
            provision_step_duration.record(
                (time.time() - step_start) * 1000,
                {"step": "authenticate"}
            )

        # Step 2: Fetch service profile from BSS
        with tracer.start_as_current_span("cpe.provision.fetch_profile") as profile_span:
            step_start = time.time()
            service_profile = fetch_service_profile(
                device_record.customer_id,
                device_record.service_plan
            )

            if not service_profile:
                profile_span.set_status(StatusCode.ERROR, "No service profile found")
                provision_counter.add(1, {"result": "no_profile"})
                return create_fault_response("Service profile missing")

            profile_span.set_attribute(
                "cpe.profile.parameter_count",
                len(service_profile.parameters)
            )
            provision_step_duration.record(
                (time.time() - step_start) * 1000,
                {"step": "fetch_profile"}
            )

        # Step 3: Build and push configuration
        with tracer.start_as_current_span("cpe.provision.push_config") as config_span:
            step_start = time.time()
            config_params = build_config(service_profile, device_record)

            config_span.set_attributes({
                "cpe.config.param_count": len(config_params),
                "cpe.config.has_voip": "voip" in service_profile.services,
                "cpe.config.has_iptv": "iptv" in service_profile.services,
                "cpe.config.wifi_bands": service_profile.wifi_bands,
            })

            # Send SetParameterValues RPC to CPE
            rpc_response = send_set_parameter_values(config_params)

            if rpc_response.fault_code:
                config_span.set_status(
                    StatusCode.ERROR,
                    f"SetParameterValues fault: {rpc_response.fault_string}"
                )
                config_span.set_attribute("cpe.fault_code", rpc_response.fault_code)
                provision_counter.add(1, {"result": "config_push_failed"})
                return rpc_response

            provision_step_duration.record(
                (time.time() - step_start) * 1000,
                {"step": "push_config"}
            )

        # Step 4: Verify configuration was applied
        with tracer.start_as_current_span("cpe.provision.verify") as verify_span:
            step_start = time.time()
            verification = send_get_parameter_values(
                [p.name for p in config_params[:5]]  # spot-check a few params
            )

            mismatches = check_config_matches(config_params, verification)
            verify_span.set_attribute("cpe.verify.mismatches", len(mismatches))

            if mismatches:
                verify_span.set_status(StatusCode.ERROR, "Config verification failed")
                provision_counter.add(1, {"result": "verification_failed"})
            else:
                provision_counter.add(1, {"result": "success"})

            provision_step_duration.record(
                (time.time() - step_start) * 1000,
                {"step": "verify"}
            )

        # Record total provisioning duration
        total_ms = (time.time() - start_time) * 1000
        provision_duration.record(total_ms, {
            "cpe.model": inform_request.device_id.model_name,
            "cpe.service_plan": device_record.service_plan,
        })

    finally:
        active_sessions.add(-1)
```

## Collector Configuration

```yaml
# otel-collector-cpe.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Filter out periodic inform noise - only keep bootstrap and boot events
  filter:
    traces:
      span:
        - 'attributes["cpe.event_codes"] == "2 PERIODIC"'

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## What to Alert On

- **Provisioning failure rate above 5%**: Indicates a systemic issue, possibly a BSS/OSS integration problem.
- **Average provisioning duration above 60 seconds**: Slow provisioning leads to support calls.
- **Config verification mismatches**: The CPE is not applying parameters correctly, often a firmware bug.
- **Active sessions exceeding capacity**: Your ACS might need scaling.

With this level of instrumentation, when a customer calls to say their new router is not working, you can look up the device serial number, pull the provisioning trace, and see exactly which step failed. That turns a 30-minute troubleshooting call into a 2-minute resolution.
