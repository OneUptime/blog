# How to Configure CircleCI with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CircleCI, CI/CD, Docker, DevOps, Testing

Description: Configure CircleCI pipelines for IPv6 testing using self-hosted runners, Docker networks with IPv6, and pipeline steps that verify IPv6 connectivity.

## Introduction

CircleCI's cloud machine executor can test local IPv6 traffic, but CircleCI does not support IPv6 internet traffic in its cloud environment. Self-hosted machine runners can provide full IPv6 connectivity. This guide covers setting up a CircleCI machine runner with IPv6, configuring Docker IPv6 networks for test containers, and writing CircleCI config.yml for IPv6 testing.

## Step 1: Set Up a Self-Hosted CircleCI Machine Runner with IPv6

```bash
# Install CircleCI machine runner 3 on a host with IPv6 connectivity

# Follow CircleCI's runner installation guide for your OS

# Debian/Ubuntu installation
curl -s https://packagecloud.io/install/repositories/circleci/runner/script.deb.sh?any=true | sudo bash
sudo apt-get install -y circleci-runner

# Configure the runner
sudo mkdir -p /etc/circleci-runner /var/lib/circleci-runner/workdir
sudo tee /etc/circleci-runner/circleci-runner-config.yaml > /dev/null << EOF
api:
  auth_token: <your-runner-token>

runner:
  name: ipv6-runner-$(hostname)
  working_directory: /var/lib/circleci-runner/workdir
  cleanup_working_directory: true
EOF

# Start the runner
sudo systemctl enable circleci-runner && sudo systemctl start circleci-runner

# Verify the runner has IPv6
ip -6 addr show scope global
ping -6 -c 3 2606:4700:4700::1111
```

## Step 2: Enable Docker IPv6 on the Runner Host

```bash
# Configure Docker's default bridge network for IPv6 on the runner host
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:1::/64",
  "ip6tables": true
}
EOF

sudo systemctl restart docker

# Verify Docker has IPv6
docker info | grep -i ipv6
```

This enables IPv6 on Docker's default bridge network. User-defined test networks still need the `--ipv6` flag when you create them.

## Step 3: CircleCI config.yml with IPv6

```yaml
# .circleci/config.yml

version: 2.1

jobs:
  test-ipv6-connectivity:
    machine: true
    resource_class: <your-namespace>/<your-resource-class>
    steps:
      - checkout

      - run:
          name: Verify IPv6 availability
          command: |
            ip -6 addr show scope global
            ping -6 -c 3 2606:4700:4700::1111
            curl -6 https://api6.ipify.org

      - run:
          name: Create IPv6 Docker network
          command: |
            docker network create \
              --driver bridge \
              --ipv6 \
              --subnet fd00:2::/64 \
              --gateway fd00:2::1 \
              ipv6-test-net

      - run:
          name: Start test services with IPv6
          command: |
            docker run -d \
              --name test-server \
              --network ipv6-test-net \
              nginx:latest

            # Wait for container to start
            sleep 2

            # Get the IPv6 address of the container
            IPV6_ADDR=$(docker inspect test-server \
              -f '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')
            echo "Test server IPv6: $IPV6_ADDR"
            echo "export TEST_SERVER_IPV6=$IPV6_ADDR" >> $BASH_ENV

      - run:
          name: Run IPv6 integration tests
          command: |
            source $BASH_ENV
            # Test from another container on the IPv6 network
            docker run --rm --network ipv6-test-net \
              curlimages/curl:latest \
              curl --fail -6 "http://[$TEST_SERVER_IPV6]/" -v

      - run:
          name: Cleanup
          command: |
            docker rm -f test-server || true
            docker network rm ipv6-test-net || true
          when: always

  build-and-push-ipv6:
    machine: true
    resource_class: <your-namespace>/<your-resource-class>
    steps:
      - checkout

      - run:
          name: Build application
          command: docker build -t myapp:$CIRCLE_SHA1 .

      - run:
          name: Test application IPv6 support
          command: |
            APP_PORT=8080 # Replace with your container port.
            APP_HEALTH_PATH=/health # Replace with an endpoint your app exposes.

            docker network create \
              --driver bridge \
              --ipv6 \
              --subnet fd00:3::/64 \
              --gateway fd00:3::1 \
              app-ipv6-net

            docker run -d --name myapp \
              --network app-ipv6-net \
              -e LISTEN_ON_IPV6=true \
              myapp:$CIRCLE_SHA1

            sleep 2
            docker logs myapp

            APP_IPV6=$(docker inspect myapp \
              -f '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')

            docker run --rm --network app-ipv6-net \
              curlimages/curl:latest \
              curl --fail -6 "http://[$APP_IPV6]:$APP_PORT$APP_HEALTH_PATH"

      - run:
          name: Cleanup
          command: |
            docker rm -f myapp || true
            docker network rm app-ipv6-net || true
          when: always

workflows:
  ipv6-pipeline:
    jobs:
      - test-ipv6-connectivity:
          filters:
            branches:
              only:
                - main
                - /feature\/.*/
      - build-and-push-ipv6:
          requires:
            - test-ipv6-connectivity
```

## Step 4: Testing Application IPv6 Binding in CircleCI

```yaml
# Additional job to test application-level IPv6 support
test-app-ipv6:
  machine: true
  resource_class: <your-namespace>/<your-resource-class>
  steps:
    - checkout

    - run:
        name: Test a Python service listens on IPv6
        command: |
          python3 -m http.server --bind :: 8080 &
          APP_PID=$!
          sleep 2

          # Verify it's listening on IPv6
          ss -6 -t -l -n | grep ":8080"

          # Test IPv6 connection
          curl --fail -6 "http://[::1]:8080/"

          kill $APP_PID
          wait $APP_PID 2>/dev/null || true
```

## Troubleshooting CircleCI IPv6

```bash
# If tests fail, check runner IPv6 status
sudo journalctl -u circleci-runner -n 50

# Verify Docker IPv6 is working on the runner
docker run --rm ubuntu:22.04 ip -6 addr show

# Verify the Docker bridge networks have IPv6 enabled
docker network inspect bridge
docker network create --driver bridge --ipv6 --subnet fd00:4::/64 ipv6-debug-net
docker network inspect ipv6-debug-net
docker network rm ipv6-debug-net

# Confirm IPv6 forwarding is enabled on the runner host
sysctl net.ipv6.conf.all.forwarding
```

## Conclusion

CircleCI IPv6 testing is most effective with a self-hosted machine runner configured with IPv6 access and Docker IPv6 enabled. The `config.yml` structure allows creating IPv6 Docker networks per job, running containers on those networks, and testing application IPv6 connectivity within the pipeline. For production use, ensure the runner host has a stable global IPv6 address, Docker can manage IPv6 packet filtering with `ip6tables`, and IPv6 forwarding is enabled on the host.
