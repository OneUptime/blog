# How to Set Up Selenium Grid for Browser Testing on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Selenium, Testing, Browser, Automation, Linux

Description: Learn how to set up Selenium Grid on RHEL for distributed browser testing, including hub and node configuration, Docker-based deployment, parallel test execution, and remote browser management.

---

Selenium Grid lets you run browser tests across multiple machines and browsers in parallel. Instead of running tests sequentially on a single machine, the Grid distributes them across nodes, each running different browser configurations. This dramatically reduces test execution time. This guide covers setting up Selenium Grid on RHEL.

## Selenium Grid Architecture

Selenium Grid 4 uses a hub-and-node architecture:

- **Router** - receives test requests and routes them to available nodes
- **Distributor** - assigns test sessions to nodes based on capabilities
- **Session Map** - tracks which node owns which session
- **Node** - runs the actual browser and executes commands

In standalone mode, all components run in a single process. In distributed mode, they run separately for scalability.

## Prerequisites

- RHEL with at least 4 GB of RAM
- Java 11 or newer
- Chrome or Firefox installed
- Root or sudo access

## Installing Java

```bash
# Install Java 17
sudo dnf install -y java-17-openjdk java-17-openjdk-devel
```

```bash
# Verify Java
java -version
```

## Installing Browsers

```bash
# Install Firefox
sudo dnf install -y firefox
```

For Chrome:

```bash
# Add the Google Chrome repository
sudo tee /etc/yum.repos.d/google-chrome.repo > /dev/null << 'EOF'
[google-chrome]
name=Google Chrome
baseurl=https://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
```

```bash
# Install Chrome
sudo dnf install -y google-chrome-stable
```

## Installing WebDrivers

```bash
# Download ChromeDriver
CHROME_VERSION=$(google-chrome --version | grep -oP '\d+\.\d+\.\d+')
curl -LO "https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}.0/linux64/chromedriver-linux64.zip"
unzip chromedriver-linux64.zip
sudo mv chromedriver-linux64/chromedriver /usr/local/bin/
sudo chmod +x /usr/local/bin/chromedriver
```

```bash
# Download GeckoDriver for Firefox
GECKO_VERSION="0.34.0"
curl -LO "https://github.com/mozilla/geckodriver/releases/download/v${GECKO_VERSION}/geckodriver-v${GECKO_VERSION}-linux64.tar.gz"
tar xzf geckodriver-v${GECKO_VERSION}-linux64.tar.gz
sudo mv geckodriver /usr/local/bin/
sudo chmod +x /usr/local/bin/geckodriver
```

## Setting Up Selenium Grid Standalone

Download the Selenium Server:

```bash
# Download Selenium Server
SELENIUM_VERSION="4.18.1"
curl -LO "https://github.com/SeleniumHQ/selenium/releases/download/selenium-${SELENIUM_VERSION}/selenium-server-${SELENIUM_VERSION}.jar"
sudo mv selenium-server-${SELENIUM_VERSION}.jar /opt/selenium-server.jar
```

Start in standalone mode:

```bash
# Start Selenium Grid in standalone mode
java -jar /opt/selenium-server.jar standalone --port 4444
```

The Grid UI is available at `http://localhost:4444`.

## Distributed Grid Setup

### Starting the Hub

```bash
# Start the hub
java -jar /opt/selenium-server.jar hub --port 4444
```

### Starting Nodes

On each node machine:

```bash
# Start a Chrome node
java -jar /opt/selenium-server.jar node \
  --hub http://hub-ip:4444 \
  --port 5555 \
  --max-sessions 5
```

```bash
# Start a Firefox node
java -jar /opt/selenium-server.jar node \
  --hub http://hub-ip:4444 \
  --port 5556 \
  --max-sessions 5
```

## Docker-Based Deployment

The easiest way to run Selenium Grid is with containers:

```bash
# Install Podman
sudo dnf install -y podman podman-compose
```

Create a compose file:

```yaml
# docker-compose.yml
version: "3"
services:
  hub:
    image: selenium/hub:4.18
    container_name: selenium-hub
    ports:
      - "4444:4444"

  chrome:
    image: selenium/node-chrome:4.18
    depends_on:
      - hub
    environment:
      - SE_EVENT_BUS_HOST=hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=5
    deploy:
      replicas: 2

  firefox:
    image: selenium/node-firefox:4.18
    depends_on:
      - hub
    environment:
      - SE_EVENT_BUS_HOST=hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=5
    deploy:
      replicas: 2
```

```bash
# Start the Grid
podman-compose up -d
```

## Creating a Systemd Service

```bash
# Create a systemd service for Selenium Grid standalone
sudo tee /etc/systemd/system/selenium-grid.service > /dev/null << 'EOF'
[Unit]
Description=Selenium Grid
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/java -jar /opt/selenium-server.jar standalone --port 4444
Restart=on-failure
RestartSec=10
User=selenium

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Create the selenium user and start the service
sudo useradd -r -s /sbin/nologin selenium
sudo systemctl daemon-reload
sudo systemctl enable --now selenium-grid
```

## Writing Tests Against the Grid

### Python with pytest

```bash
# Install Selenium Python bindings
pip3 install --user selenium pytest
```

```python
# test_web.py
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

@pytest.fixture
def driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    driver = webdriver.Remote(
        command_executor="http://localhost:4444/wd/hub",
        options=chrome_options
    )
    yield driver
    driver.quit()

def test_page_title(driver):
    driver.get("https://example.com")
    assert "Example Domain" in driver.title

def test_page_content(driver):
    driver.get("https://example.com")
    heading = driver.find_element(By.TAG_NAME, "h1")
    assert heading.text == "Example Domain"
```

```bash
# Run the tests
pytest test_web.py -v
```

### Running Tests in Parallel

```bash
# Install pytest-xdist for parallel execution
pip3 install --user pytest-xdist
```

```bash
# Run tests across 4 parallel workers
pytest test_web.py -n 4 -v
```

### Testing Multiple Browsers

```python
# conftest.py
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

@pytest.fixture(params=["chrome", "firefox"])
def driver(request):
    if request.param == "chrome":
        options = ChromeOptions()
        options.add_argument("--headless")
    else:
        options = FirefoxOptions()
        options.add_argument("--headless")

    driver = webdriver.Remote(
        command_executor="http://localhost:4444/wd/hub",
        options=options
    )
    yield driver
    driver.quit()
```

## Configuring the Firewall

```bash
# Open the Selenium Grid port
sudo firewall-cmd --permanent --add-port=4444/tcp
sudo firewall-cmd --reload
```

## Monitoring the Grid

Visit `http://localhost:4444/ui` to see:

- Active sessions
- Available nodes and their capabilities
- Queue depth
- Session history

Check Grid status via the API:

```bash
# Check Grid status
curl -s http://localhost:4444/status | python3 -m json.tool
```

## Conclusion

Selenium Grid on RHEL provides a scalable infrastructure for running browser tests in parallel across multiple browsers and configurations. Whether you run it as a standalone server, a distributed hub-and-node setup, or a containerized deployment, the Grid reduces test execution time and gives you consistent, reproducible browser testing across your team.
