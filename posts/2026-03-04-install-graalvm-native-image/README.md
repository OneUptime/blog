# How to Install GraalVM Native Image on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GraalVM, Java, Linux

Description: Learn how to install GraalVM Native Image on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to install GraalVM Native Image on RHEL. Following these steps will help you set up a reliable GraalVM installation and verify that the `native-image` tool can build a native executable.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A Red Hat subscription with enabled BaseOS and AppStream repositories

## Overview

GraalVM Native Image compiles Java bytecode ahead of time into a native executable. The `native-image` tool is included in GraalVM and depends on a local Linux toolchain, including GCC and development headers.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl tar gzip gcc glibc-devel zlib-devel libstdc++-static
```

## Step 2: Install Required Packages

If `libstdc++-static` is not available, enable the CodeReady Linux Builder repository for your RHEL release and architecture, then run the dependency installation again:

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-$(rpm -E %rhel)-$(uname -m)-rpms
sudo dnf install -y libstdc++-static
```

Verify the installation:

```bash
gcc --version
rpm -q glibc-devel zlib-devel libstdc++-static
```

## Step 3: Install GraalVM

Download and extract the current GraalVM JDK archive. Set `GRAAL_ARCH` to `x64` on x86_64 systems or `aarch64` on ARM64 systems:

```bash
GRAAL_JDK_VERSION=25
GRAAL_ARCH=x64
curl -L -O https://download.oracle.com/graalvm/${GRAAL_JDK_VERSION}/latest/graalvm-jdk-${GRAAL_JDK_VERSION}_linux-${GRAAL_ARCH}_bin.tar.gz
sudo tar -xzf graalvm-jdk-${GRAAL_JDK_VERSION}_linux-${GRAAL_ARCH}_bin.tar.gz -C /opt
```

The archive extracts to a GraalVM directory under `/opt`. Use that directory as `JAVA_HOME`.

## Step 4: Configure the Shell Environment

Create a profile script so new shells use GraalVM:

```bash
GRAALVM_HOME=$(find /opt -maxdepth 1 -type d -name "graalvm-jdk-${GRAAL_JDK_VERSION}*" | sort | tail -n 1)
echo "export JAVA_HOME=${GRAALVM_HOME}" | sudo tee /etc/profile.d/graalvm.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' | sudo tee -a /etc/profile.d/graalvm.sh
source /etc/profile.d/graalvm.sh
```

## Step 5: Verify the Configuration

Test the GraalVM and Native Image setup:

```bash
java -version
native-image --version
```

If `native-image` is not found, confirm that `JAVA_HOME` points to the GraalVM directory and that `$JAVA_HOME/bin` appears before other JDKs in `PATH`:

```bash
echo "$JAVA_HOME"
command -v java
command -v native-image
```

## Step 6: Configure Firewall Rules

No firewall rule is required for installing GraalVM Native Image or compiling local applications. Configure firewall rules only for the application you build if that application listens on a network port.

For example, open HTTPS only if your native application serves HTTPS traffic:

```bash
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 7: Build a Test Native Image

Create a small Java program and compile it to a native executable:

```bash
cat > HelloWorld.java <<'EOF'
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, Native World!");
    }
}
EOF

javac HelloWorld.java
native-image HelloWorld
./helloworld
```

## Security Considerations

- Install GraalVM in a root-owned directory such as `/opt` if it will be shared by multiple users
- Build and run applications as a non-root user whenever possible
- Keep RHEL packages updated with `dnf update`
- Download GraalVM only from trusted Oracle or GraalVM distribution sources

## Troubleshooting

Common issues and solutions:

1. **`native-image: command not found`**: Verify `JAVA_HOME` and `PATH` with `echo "$JAVA_HOME"` and `command -v native-image`
2. **Missing compiler or headers**: Install `gcc`, `glibc-devel`, `zlib-devel`, and `libstdc++-static`
3. **Package not found for `libstdc++-static`**: Enable the CodeReady Linux Builder repository for your RHEL release
4. **Build fails for dynamic features**: Provide Native Image reachability metadata for reflection, JNI, dynamic proxies, or resources used by the application

## Conclusion

You have successfully installed GraalVM Native Image on RHEL. Keep the operating system packages and GraalVM installation updated to maintain security and compatibility.
