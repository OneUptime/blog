# Validation Summary: How to Configure GPIO Access on Ubuntu for Raspberry Pi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 and 24.04 on Raspberry Pi
- Raspberry Pi GPIO character devices
- libgpiod command-line tools
- gpiozero with lgpio pin factory
- Python lgpio
- Raspberry Pi I2C and SPI configuration
- Adafruit CircuitPython BME280 library
- udev permissions

## Sources Consulted
- Ubuntu tutorial: How to use Raspberry Pi GPIO pins with Ubuntu: https://ubuntu.com/tutorials/gpio-on-raspberry-pi
- Ubuntu 24.04 manpage for gpioset v1.6.3: https://manpages.ubuntu.com/manpages/noble/man1/gpioset.1.html
- Ubuntu 24.04 manpage for gpioget v1.6.3: https://manpages.ubuntu.com/manpages/noble/man1/gpioget.1.html
- Ubuntu 24.04 manpage for gpiomon v1.6.3: https://manpages.ubuntu.com/manpages/noble/man1/gpiomon.1.html
- Raspberry Pi GPIO Usage white paper: https://pip-assets.raspberrypi.com/categories/685-whitepapers-app-notes-compliance-guides/documents/RP-006553-WP/A-history-of-GPIO-usage-on-Raspberry-Pi-devices-and-current-best-practices
- Raspberry Pi GPIO and 40-pin header documentation: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio
- Raspberry Pi configuration and Device Tree documentation: https://www.raspberrypi.com/documentation/computers/configuration.html
- GPIO Zero pin factory and environment variable documentation: https://gpiozero.readthedocs.io/en/stable/api_pins.html and https://gpiozero.readthedocs.io/en/rtd/cli_env.html
- Adafruit BME280 CircuitPython API documentation: https://docs.circuitpython.org/projects/bme280/en/2.6.13/api.html
- Ubuntu python3-lgpio package source installed for API inspection: python3-lgpio 0.2.0.0-0ubuntu3

## Issues Found
- The post stated that RPi.GPIO uses the legacy sysfs interface. RPi.GPIO uses low-level Raspberry Pi hardware access, and the modern issue is compatibility with newer kernels and Raspberry Pi models. Updated the wording accordingly.
- The optional `pip3 install RPi.GPIO` command could install into the system environment. Changed it to `python3 -m pip install --user RPi.GPIO` while retaining the warning that it may not work depending on kernel version and Pi model.
- The one-off `sudo chown root:gpio /dev/gpiochip0` command only fixed one chip even though the post discusses multiple GPIO chips. Changed it to apply to `/dev/gpiochip*`.
- The post implied line offsets 0-27 are physical BCM pin numbers. Clarified that, on the user-facing GPIO chip, line offsets generally match BCM GPIO numbers and users should verify the correct chip with `gpiodetect`.
- The examples assumed `gpiochip0` for all Raspberry Pi models. Added a note that current kernels normally expose user-facing GPIO as `gpiochip0`, while older Raspberry Pi 5 kernels may expose it as `gpiochip4`.
- The `gpioset` examples used the default libgpiod v1 mode, which exits immediately. Updated examples to use `--mode=wait` for held values and `--mode=time --usec=500000` for the blink loop.
- The BME280 example used `import adafruit_bme280` directly and manually constructed `busio.I2C`. Updated it to match Adafruit's documented API with `from adafruit_bme280 import basic as adafruit_bme280` and `board.I2C()`.

## Review Notes
- The post remains version-sensitive because libgpiod v1 and v2 command behavior differs. Ubuntu 22.04 and 24.04 currently package libgpiod 1.6.3, so the corrected commands match the versions named in the post.
- Raspberry Pi 5 GPIO chip numbering has changed across kernel versions. The post now tells readers to verify the user-facing chip instead of relying blindly on a fixed chip number.
