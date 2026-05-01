# How to Detect IPv4 Network Anomalies with Scapy and Machine Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Scapy, Machine Learning, Network Security, IPv4, Anomaly Detection, Python

Description: Build a simple IPv4 network anomaly detection system using Scapy for packet capture and scikit-learn's Isolation Forest algorithm to identify unusual traffic patterns.

## Introduction

Network anomaly detection identifies traffic patterns that deviate from the baseline - port scans, DDoS floods, exfiltration, or unusual protocols. By combining Scapy's packet capture capabilities with machine learning (Isolation Forest), you can detect anomalies without writing explicit rules for every attack type.

## Prerequisites

```bash
pip install scapy scikit-learn pandas numpy
```

## Step 1: Capture and Feature Extract Packets

Define features to extract from each IPv4 packet:

```python
from scapy.all import sniff, IP, TCP, UDP, ICMP
import pandas as pd
import numpy as np

# Feature extraction function

def extract_features(pkt):
    """Extract numeric features from an IPv4 packet for ML analysis."""
    if not pkt.haslayer(IP):
        return None
    
    ip = pkt[IP]
    features = {
        'proto': ip.proto,            # Protocol number (TCP=6, UDP=17, ICMP=1)
        'ttl': ip.ttl,                # IP TTL value
        'ip_len': ip.len,             # IP packet length
        'flags': int(ip.flags),       # IP flags (DF, MF)
        'sport': 0,
        'dport': 0,
        'tcp_flags': 0,
        'payload_len': len(ip.payload)
    }
    
    if pkt.haslayer(TCP):
        features['sport'] = pkt[TCP].sport
        features['dport'] = pkt[TCP].dport
        features['tcp_flags'] = int(pkt[TCP].flags)
    elif pkt.haslayer(UDP):
        features['sport'] = pkt[UDP].sport
        features['dport'] = pkt[UDP].dport
    
    return features

# Capture packets and build a dataset
print("Capturing 5000 packets for baseline...")
packets = sniff(count=5000, filter="ip")

feature_list = [f for pkt in packets if (f := extract_features(pkt)) is not None]
df = pd.DataFrame(feature_list)
print(f"Captured {len(df)} IPv4 packets")
print(df.describe())
```

## Step 2: Train the Isolation Forest Model

```python
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

# Prepare features for training
features = ['proto', 'ttl', 'ip_len', 'flags', 'sport', 'dport', 'tcp_flags', 'payload_len']
X = df[features].values

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train Isolation Forest
# contamination: expected fraction of anomalies in baseline data (tune this)
model = IsolationForest(
    n_estimators=100,
    contamination=0.05,    # Assume 5% of baseline traffic is anomalous
    random_state=42,
    n_jobs=-1
)
model.fit(X_scaled)

# Save the model and scaler
joblib.dump(model, 'anomaly_model.pkl')
joblib.dump(scaler, 'anomaly_scaler.pkl')
print("Model trained and saved")
```

## Step 3: Real-Time Anomaly Detection

```python
import joblib
from scapy.all import sniff, IP, TCP, UDP
from datetime import datetime

# Load saved model and scaler
model = joblib.load('anomaly_model.pkl')
scaler = joblib.load('anomaly_scaler.pkl')

anomaly_count = 0

def extract_features(pkt):
    """Extract numeric features from an IPv4 packet for ML analysis."""
    if not pkt.haslayer(IP):
        return None
    
    ip = pkt[IP]
    features = {
        'proto': ip.proto,
        'ttl': ip.ttl,
        'ip_len': ip.len,
        'flags': int(ip.flags),
        'sport': 0,
        'dport': 0,
        'tcp_flags': 0,
        'payload_len': len(ip.payload)
    }
    
    if pkt.haslayer(TCP):
        features['sport'] = pkt[TCP].sport
        features['dport'] = pkt[TCP].dport
        features['tcp_flags'] = int(pkt[TCP].flags)
    elif pkt.haslayer(UDP):
        features['sport'] = pkt[UDP].sport
        features['dport'] = pkt[UDP].dport
    
    return features

def detect_anomaly(pkt):
    """Callback function: score each packet for anomaly."""
    global anomaly_count
    features = extract_features(pkt)
    if features is None:
        return
    
    feature_cols = ['proto', 'ttl', 'ip_len', 'flags', 'sport', 'dport', 'tcp_flags', 'payload_len']
    X = [[features[f] for f in feature_cols]]
    X_scaled = scaler.transform(X)
    
    prediction = model.predict(X_scaled)[0]   # -1 = anomaly, 1 = normal
    anomaly_score = model.decision_function(X_scaled)[0]
    
    if prediction == -1:
        anomaly_count += 1
        ip = pkt[IP]
        print(f"[ANOMALY] {datetime.now()} | {ip.src} -> {ip.dst} | "
              f"proto={ip.proto} ttl={ip.ttl} len={ip.len} score={anomaly_score:.2f}")

print("Starting real-time anomaly detection...")
sniff(filter="ip", prn=detect_anomaly, store=False)
```

## Interpreting Results

- **Anomaly score < 0**: Packet classified as anomalous
- **Anomaly score near 0**: Borderline or close to the model threshold
- **Anomaly score > 0**: Packet classified as normal

Tune the `contamination` parameter based on your false positive rate.

## Conclusion

Combining Scapy for packet capture with Isolation Forest for anomaly detection provides a foundation for network intrusion detection without hand-crafted rules. For production use, tune the model on weeks of baseline data, add alert deduplication, and integrate with your SIEM or alerting system.
