# How to Install and Configure Grafana Agent for Metrics Collection on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Grafana

Description: Step-by-step guide on install and configure grafana agent for metrics collection on rhel 9 with practical examples and commands.

---

Grafana Alloy collects and ships metrics from RHEL 9 to Grafana Cloud or a Prometheus-compatible backend.

## Install Grafana Alloy

```bash
sudo dnf install -y wget
wget -q -O gpg.key https://rpm.grafana.com/gpg.key
sudo rpm --import gpg.key
echo -e '[grafana]\nname=grafana\nbaseurl=https://rpm.grafana.com\nrepo_gpgcheck=1\nenabled=1\ngpgcheck=1\ngpgkey=https://rpm.grafana.com/gpg.key\nsslverify=1\nsslcacert=/etc/pki/tls/certs/ca-bundle.crt' | sudo tee /etc/yum.repos.d/grafana.repo
sudo dnf install -y alloy
```

## Configure Alloy

```bash
sudo tee /etc/alloy/config.alloy <<EOF
prometheus.exporter.unix "node" { }

prometheus.scrape "node" {
  targets         = prometheus.exporter.unix.node.targets
  scrape_interval = "15s"
  forward_to      = [prometheus.remote_write.grafana_cloud.receiver]
}

prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "https://prometheus-us-central1.grafana.net/api/prom/push"

    basic_auth {
      username = "YOUR_GRAFANA_CLOUD_USER"
      password = "YOUR_GRAFANA_CLOUD_API_KEY"
    }
  }
}

loki.source.journal "system" {
  labels = {
    job  = "systemd-journal",
    host = "rhel9-server-01",
  }

  forward_to = [loki.write.grafana_cloud.receiver]
}

loki.write "grafana_cloud" {
  endpoint {
    url = "https://logs-prod-us-central1.grafana.net/loki/api/v1/push"

    basic_auth {
      username = "YOUR_GRAFANA_CLOUD_USER"
      password = "YOUR_GRAFANA_CLOUD_API_KEY"
    }
  }
}
EOF
```

## Allow Alloy to Read the Journal

```bash
sudo usermod -a -G adm,systemd-journal alloy
```

## Start Grafana Alloy

```bash
sudo systemctl enable --now alloy
```

## Verify

```bash
sudo systemctl status alloy
sudo journalctl -u alloy -n 50 --no-pager
```

## Conclusion

Grafana Alloy on RHEL 9 provides efficient metrics and log collection for Grafana Cloud. Use its built-in Unix exporter for comprehensive system observability.
