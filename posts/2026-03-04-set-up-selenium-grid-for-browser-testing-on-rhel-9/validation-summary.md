# Validation Summary: How to Set Up Selenium Grid for Browser Testing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Selenium Grid 4
- Selenium WebDriver for Python
- ChromeDriver and GeckoDriver
- Google Chrome and Firefox
- Podman and Compose
- systemd
- firewalld
- pytest and pytest-xdist

## Sources Consulted
- Selenium Grid getting started documentation: https://www.selenium.dev/documentation/grid/getting_started/
- Selenium Grid components documentation: https://www.selenium.dev/documentation/grid/components/
- Selenium Grid CLI options documentation: https://www.selenium.dev/documentation/grid/configuration/cli_options/
- Selenium Python Remote WebDriver API documentation: https://www.selenium.dev/selenium/docs/api/py/selenium_webdriver_remote/selenium.webdriver.remote.webdriver.html
- Selenium Docker images README and compose examples: https://github.com/SeleniumHQ/docker-selenium
- ChromeDriver documentation: https://developer.chrome.com/docs/chromedriver
- Chrome for Testing JSON endpoint documentation: https://github.com/GoogleChromeLabs/chrome-for-testing
- Mozilla geckodriver releases: https://github.com/mozilla/geckodriver/releases
- Red Hat RHEL 9 OpenJDK and container tooling documentation: https://docs.redhat.com/
- firewalld command documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- pytest-xdist documentation: https://pytest-xdist.readthedocs.io/

## Issues Found
- The Selenium Grid architecture section omitted the New Session Queue and Event Bus, which are core Selenium Grid 4 components. Added both to match the official component model.
- The ChromeDriver download command derived a three-part Chrome build and appended `.0`, which can produce invalid Chrome for Testing URLs. Replaced it with the official `LATEST_RELEASE_<MAJOR.MINOR.BUILD>` lookup.
- The post pinned old Selenium Server, GeckoDriver, and Selenium Docker image versions. Updated them to current verified releases available as of 2026-05-15.
- The distributed node examples set `--max-sessions 5` without `--override-max-sessions true`. Added the override flag because Selenium treats processor count as the recommended maximum unless explicitly overridden.
- The container section installed `podman podman-compose` and used `podman-compose`; RHEL documentation points users to `container-tools` and current Podman Compose usage. Updated the install and start commands.
- The Compose file used `deploy.replicas`, which is not the right way to scale a local Compose Grid with Podman/Docker Compose. Removed `deploy.replicas` and used `--scale` in the startup command.
- The Compose file did not expose Selenium Hub Event Bus ports and lacked the shared-memory sizing recommended by Selenium Docker for browser containers. Added ports `4442`, `4443`, and `4444`, plus `shm_size: 2gb`.
- The Python examples used the legacy `/wd/hub` URL. Updated them to `http://localhost:4444`, matching current Selenium Grid documentation.

## Review Notes
The manual WebDriver installation section is valid, but Selenium Grid can also use Selenium Manager with `--selenium-manager true` when drivers are not already installed on the node PATH. The post intentionally keeps the manual driver installation workflow.
