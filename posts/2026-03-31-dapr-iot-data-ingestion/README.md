# How to Build an IoT Data Ingestion Platform with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, MQTT, Binding, Pub/Sub

Description: Learn how to build an IoT data ingestion platform using Dapr MQTT bindings and pub/sub to collect, process, and store sensor data from connected devices.

---

## Overview

An IoT data ingestion platform collects telemetry from thousands of devices, validates and enriches it, and routes it to storage and alerting systems. Dapr's MQTT binding and pub/sub building blocks provide the infrastructure for reliable device-to-cloud data pipelines.

## MQTT Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-telemetry
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
    - name: url
      value: "tcp://mqtt-broker:1883"
    - name: topic
      value: "devices/+/telemetry"
    - name: qos
      value: "1"
    - name: cleanSession
      value: "true"
    - name: retain
      value: "false"
```

## Device Telemetry Model

```go
package main

type DeviceTelemetry struct {
    DeviceID    string             `json:"deviceId"`
    DeviceType  string             `json:"deviceType"`
    Location    string             `json:"location"`
    Timestamp   int64              `json:"timestamp"`
    Sensors     map[string]float64 `json:"sensors"`
    Battery     float64            `json:"battery"`
    SignalStrength int             `json:"rssi"`
}

type Alert struct {
    DeviceID  string  `json:"deviceId"`
    AlertType string  `json:"alertType"`
    Value     float64 `json:"value"`
    Threshold float64 `json:"threshold"`
    Timestamp int64   `json:"timestamp"`
}
```

## Ingestion Handler

```go
type IoTIngestionService struct {
    daprClient dapr.Client
}

func (svc *IoTIngestionService) HandleTelemetry(ctx context.Context, in *common.BindingEvent) ([]byte, error) {
    var telemetry DeviceTelemetry
    if err := json.Unmarshal(in.Data, &telemetry); err != nil {
        return nil, fmt.Errorf("invalid payload: %w", err)
    }

    telemetry.Timestamp = time.Now().UnixMilli()

    // Validate device is registered
    if !svc.isDeviceRegistered(ctx, telemetry.DeviceID) {
        return []byte(`{"status":"rejected","reason":"unregistered device"}`), nil
    }

    // Update device last-seen state
    svc.updateDeviceState(ctx, telemetry)

    // Check thresholds
    svc.checkAlerts(ctx, telemetry)

    // Fan out to storage and analytics topics
    svc.daprClient.PublishEvent(ctx, "iot-pubsub", "raw-telemetry", telemetry)

    return []byte(`{"status":"accepted"}`), nil
}

func (svc *IoTIngestionService) isDeviceRegistered(ctx context.Context, deviceID string) bool {
    item, err := svc.daprClient.GetState(ctx, "iot-store", "device:"+deviceID, nil)
    return err == nil && item.Value != nil
}
```

## Device State Tracking

```go
type DeviceState struct {
    DeviceID    string             `json:"deviceId"`
    LastSeen    int64              `json:"lastSeen"`
    LastValues  map[string]float64 `json:"lastValues"`
    Online      bool               `json:"online"`
    BatteryPct  float64            `json:"batteryPct"`
}

func (svc *IoTIngestionService) updateDeviceState(ctx context.Context, t DeviceTelemetry) {
    state := DeviceState{
        DeviceID:   t.DeviceID,
        LastSeen:   t.Timestamp,
        LastValues: t.Sensors,
        Online:     true,
        BatteryPct: t.Battery,
    }
    data, _ := json.Marshal(state)
    svc.daprClient.SaveState(ctx, "iot-store", "device:"+t.DeviceID+":state", data, nil)
}
```

## Threshold Alert Detection

```go
type ThresholdConfig struct {
    Sensor    string  `json:"sensor"`
    MaxValue  float64 `json:"maxValue"`
    MinValue  float64 `json:"minValue"`
    AlertType string  `json:"alertType"`
}

func (svc *IoTIngestionService) checkAlerts(ctx context.Context, t DeviceTelemetry) {
    // Load device thresholds
    item, _ := svc.daprClient.GetState(ctx, "iot-store", "thresholds:"+t.DeviceType, nil)
    if item.Value == nil {
        return
    }

    var thresholds []ThresholdConfig
    json.Unmarshal(item.Value, &thresholds)

    for _, threshold := range thresholds {
        value, ok := t.Sensors[threshold.Sensor]
        if !ok {
            continue
        }

        if value > threshold.MaxValue || value < threshold.MinValue {
            alert := Alert{
                DeviceID:  t.DeviceID,
                AlertType: threshold.AlertType,
                Value:     value,
                Threshold: threshold.MaxValue,
                Timestamp: t.Timestamp,
            }
            svc.daprClient.PublishEvent(ctx, "iot-pubsub", "device-alerts", alert)
        }
    }
}
```

## Time-Series Storage via Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: influxdb-output
spec:
  type: bindings.influx
  version: v1
  metadata:
    - name: url
      value: "http://influxdb:8086"
    - name: token
      secretKeyRef:
        name: influx-secret
        key: token
    - name: org
      value: "iotorg"
    - name: bucket
      value: "telemetry"
```

```go
func storeTelemetry(client dapr.Client, t DeviceTelemetry) error {
    lines := buildLineProtocol(t)
    _, err := client.InvokeOutputBinding(context.Background(), &dapr.InvokeBindingRequest{
        Name:      "influxdb-output",
        Operation: "create",
        Data:      []byte(lines),
    })
    return err
}
```

## Summary

Dapr's MQTT input binding connects the IoT edge to your cloud services without broker-specific client code. Incoming telemetry is validated, device state updated, and threshold alerts published via pub/sub. Time-series data flows to InfluxDB through an output binding, while alert events trigger downstream notification workflows. This architecture ingests millions of sensor readings per hour while remaining easy to operate and extend.
