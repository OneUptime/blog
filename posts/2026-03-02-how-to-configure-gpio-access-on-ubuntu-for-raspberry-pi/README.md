# How to Configure GPIO Access on Ubuntu for Raspberry Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Raspberry Pi, GPIO, IoT, Hardware

Description: Learn how to configure and access GPIO pins on a Raspberry Pi running Ubuntu, using both the gpiod command-line tools and Python libraries for hardware control.

---

Ubuntu on Raspberry Pi exposes GPIO pins through the `/dev/gpiochip` interface rather than the legacy `/sys/class/gpio` sysfs interface that older Raspberry Pi OS tutorials rely on. The modern approach uses the `libgpiod` library and the character device interface, which is more robust and does not require root access once you configure proper permissions.

This guide covers both command-line GPIO access and Python GPIO programming on Ubuntu for Raspberry Pi.

## Prerequisites

- Raspberry Pi 3, 4, or 5 running Ubuntu 22.04 or 24.04
- SSH access or a monitor and keyboard
- Basic electronics knowledge (do not connect GPIO pins without understanding voltage levels)

## Understanding GPIO on Ubuntu vs Raspberry Pi OS

On Raspberry Pi OS, the popular `RPi.GPIO` Python library uses the legacy sysfs interface and works out of the box. On Ubuntu, the situation is different:

- The `RPi.GPIO` library does not work reliably on Ubuntu (it was designed for Raspberry Pi OS)
- Ubuntu uses the character device GPIO interface (`/dev/gpiochip0`, etc.)
- The `gpiod` library and Python `gpiozero` (with `lgpio` backend) are the recommended tools

## Installing GPIO Tools

```bash
# Update package list
sudo apt-get update

# Install libgpiod tools (command-line GPIO access)
sudo apt-get install -y gpiod libgpiod-dev

# Install Python GPIO libraries
sudo apt-get install -y python3-gpiozero python3-lgpio python3-pip

# Optional: RPi.GPIO works on some Ubuntu versions with extra setup
# (gpiozero is strongly preferred)
pip3 install RPi.GPIO  # May or may not work depending on kernel version
```

## Configuring GPIO Permissions

By default, `/dev/gpiochip0` requires root access. Add your user to the `gpio` group:

```bash
# Check current GPIO device permissions
ls -la /dev/gpiochip*
# crw-rw---- 1 root gpio 254, 0 Mar  2 10:00 /dev/gpiochip0

# Check if gpio group exists
getent group gpio

# If the gpio group does not exist, create it
sudo groupadd gpio

# Change group ownership of gpiochip devices
sudo chown root:gpio /dev/gpiochip0

# Add your user to the gpio group
sudo usermod -aG gpio $USER

# Apply without logout
newgrp gpio

# Verify
groups
```

Make the permission persistent across reboots with a udev rule:

```bash
# Create a udev rule for persistent GPIO access
sudo tee /etc/udev/rules.d/99-gpio.rules << 'EOF'
# Allow members of the gpio group to access GPIO character devices
SUBSYSTEM=="gpio", KERNEL=="gpiochip*", GROUP="gpio", MODE="0660"

# Also allow access to the GPIO export interface (for legacy support)
SUBSYSTEM=="gpio", GROUP="gpio", MODE="0660"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Verify
ls -la /dev/gpiochip*
```

## Identifying GPIO Chips and Pins

The Raspberry Pi has multiple GPIO chips. Identify them:

```bash
# List all GPIO chips
gpiodetect

# Example output:
# gpiochip0 [pinctrl-bcm2711] (58 lines)
# gpiochip1 [raspberrypi-exp-gpio] (8 lines)
# gpiochip2 [brcmvirt-gpio] (2 lines)

# List all pins on a chip
gpioinfo gpiochip0

# Output shows pin index, name, direction, and current state
# Lines 0-27 correspond to GPIO 0-27 (physical BCM pin numbers)
```

### BCM Pin Numbering

Ubuntu uses BCM (Broadcom) numbering. The 40-pin header on Pi 3/4/5 maps as follows for commonly used pins:

| BCM GPIO | Physical Pin | Notes |
|---|---|---|
| GPIO 2 | Pin 3 | I2C SDA |
| GPIO 3 | Pin 5 | I2C SCL |
| GPIO 4 | Pin 7 | |
| GPIO 17 | Pin 11 | |
| GPIO 27 | Pin 13 | |
| GPIO 22 | Pin 15 | |
| GPIO 10 | Pin 19 | SPI MOSI |
| GPIO 9 | Pin 21 | SPI MISO |
| GPIO 11 | Pin 23 | SPI CLK |

## Command-Line GPIO Access with gpiod

```bash
# Read a single pin state (GPIO 4, which is line 4 on gpiochip0)
gpioget gpiochip0 4

# Set a pin high (output)
gpioset gpiochip0 4=1

# Set a pin low
gpioset gpiochip0 4=0

# Read multiple pins at once
gpioget gpiochip0 4 17 27

# Set multiple pins
gpioset gpiochip0 4=1 17=0 27=1

# Monitor a pin for state changes (blocks until change)
gpiomon --num-events=5 gpiochip0 4

# Toggle an LED rapidly (500ms on, 500ms off)
while true; do
  gpioset gpiochip0 4=1; sleep 0.5
  gpioset gpiochip0 4=0; sleep 0.5
done
```

## Python GPIO with gpiozero

`gpiozero` is the recommended Python library for Ubuntu on Pi. It supports the `lgpio` backend which works with the character device interface:

```python
#!/usr/bin/env python3
# /home/ubuntu/gpio_example.py

from gpiozero import LED, Button, PWMOutputDevice
from time import sleep
import signal

# Set the pin factory to lgpio (required for Ubuntu)
# This can also be set via environment variable: GPIOZERO_PIN_FACTORY=lgpio
from gpiozero.pins.lgpio import LGPIOFactory
from gpiozero import Device
Device.pin_factory = LGPIOFactory()

# Control an LED on GPIO 17
led = LED(17)

# Blink 3 times
for i in range(3):
    led.on()
    sleep(0.5)
    led.off()
    sleep(0.5)

# PWM LED brightness control on GPIO 18
pwm_led = PWMOutputDevice(18)
# Fade from 0 to 100% brightness
for brightness in range(101):
    pwm_led.value = brightness / 100
    sleep(0.02)

# Button on GPIO 22 (with pull-up resistor)
button = Button(22, pull_up=True)

print("Waiting for button press...")
button.wait_for_press()
print("Button pressed!")

# Event-driven button handling
def button_pressed():
    print("Button pressed - turning LED on")
    led.on()

def button_released():
    print("Button released - turning LED off")
    led.off()

button.when_pressed = button_pressed
button.when_released = button_released

# Keep running until Ctrl+C
signal.pause()
```

Set the environment variable to avoid setting the pin factory in code:

```bash
# Add to ~/.bashrc for persistent setting
export GPIOZERO_PIN_FACTORY=lgpio
```

## Python GPIO with lgpio Directly

For lower-level control without gpiozero:

```python
#!/usr/bin/env python3
# Direct lgpio access
import lgpio
import time

# Open the GPIO chip
handle = lgpio.gpiochip_open(0)  # gpiochip0

# Claim a GPIO for output (GPIO 17)
lgpio.gpio_claim_output(handle, 17)

# Claim a GPIO for input with pull-up (GPIO 22)
lgpio.gpio_claim_input(handle, 22, lgpio.SET_PULL_UP)

try:
    for _ in range(10):
        # Set GPIO 17 high
        lgpio.gpio_write(handle, 17, 1)
        time.sleep(0.5)

        # Read GPIO 22
        state = lgpio.gpio_read(handle, 22)
        print(f"GPIO 22 state: {state}")

        # Set GPIO 17 low
        lgpio.gpio_write(handle, 17, 0)
        time.sleep(0.5)

finally:
    # Release GPIO and close chip handle
    lgpio.gpio_free(handle, 17)
    lgpio.gpio_free(handle, 22)
    lgpio.gpiochip_close(handle)
```

## Enabling I2C and SPI

I2C and SPI require enabling in the Pi's configuration:

```bash
# Enable I2C
sudo raspi-config nonint do_i2c 0  # 0 = enable
# Or manually: add "dtparam=i2c_arm=on" to /boot/firmware/config.txt

# Enable SPI
sudo raspi-config nonint do_spi 0  # 0 = enable

# After enabling, add user to i2c and spi groups
sudo usermod -aG i2c,spi $USER

# Verify I2C devices
sudo apt-get install -y i2c-tools
i2cdetect -y 1  # Scan I2C bus 1 (/dev/i2c-1)
```

For Ubuntu, add hardware overlays directly to `/boot/firmware/config.txt`:

```bash
sudo tee -a /boot/firmware/config.txt << 'EOF'
# Enable I2C
dtparam=i2c_arm=on

# Enable SPI
dtparam=spi=on

# Enable UART (if needed)
enable_uart=1

# Disable Bluetooth to free up UART (optional)
# dtoverlay=disable-bt
EOF

sudo reboot
```

## Reading an I2C Sensor (BME280 Example)

```python
#!/usr/bin/env python3
# Read temperature, humidity, pressure from BME280 I2C sensor
# pip3 install adafruit-circuitpython-bme280

import board
import busio
import adafruit_bme280

# Initialize I2C
i2c = busio.I2C(board.SCL, board.SDA)

# Create sensor object
bme280 = adafruit_bme280.Adafruit_BME280_I2C(i2c)

# Read values
print(f"Temperature: {bme280.temperature:.1f}°C")
print(f"Humidity: {bme280.humidity:.1f}%")
print(f"Pressure: {bme280.pressure:.1f}hPa")
```

## Troubleshooting

**PermissionError: [Errno 13] Permission denied: '/dev/gpiochip0':**
```bash
# Verify group membership
groups

# If gpio group is not listed, log out and back in
# Or use newgrp: newgrp gpio

# Check the device permissions
ls -la /dev/gpiochip0
# Should show group 'gpio' with rw permissions
```

**gpiozero not finding pins:**
```bash
# Set the pin factory explicitly
export GPIOZERO_PIN_FACTORY=lgpio

# Or check if lgpio is installed
python3 -c "import lgpio; print(lgpio.__version__)"

# Install if missing
sudo apt-get install python3-lgpio
```

**GPIO not responding after reboot:**
```bash
# Verify udev rules are applied
udevadm info -a -n /dev/gpiochip0 | grep -i gpio

# Re-apply udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

**raspi-config not available:**
```bash
# Install it on Ubuntu
sudo apt-get install -y raspi-config

# Or manually edit /boot/firmware/config.txt
```

Working with GPIO on Ubuntu requires using the modern character device interface rather than the legacy sysfs approach. Once you configure the permissions correctly and choose `gpiozero` with `lgpio` as the backend, the programming experience is clean and the code is portable to other Raspberry Pi OS versions that also support lgpio.
