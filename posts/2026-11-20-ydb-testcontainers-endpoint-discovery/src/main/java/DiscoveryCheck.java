import tech.ydb.common.transaction.TxMode;
import tech.ydb.core.grpc.GrpcTransport;
import tech.ydb.query.QueryClient;
import tech.ydb.query.tools.SessionRetryContext;
import tech.ydb.test.integration.YdbEnvironment;
import tech.ydb.test.integration.YdbHelper;
import tech.ydb.test.integration.YdbHelperFactory;

public class DiscoveryCheck {
    public static void main(String[] args) {
        String image = System.getenv("YDB_DOCKER_IMAGE");
        if (image == null || !image.matches("ydbplatform/local-ydb@sha256:[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Set YDB_DOCKER_IMAGE to your reviewed image digest");
        }
        YdbEnvironment environment = new YdbEnvironment() {
            @Override public boolean useDockerIsolation() { return true; }
            @Override public boolean dockerReuse() { return false; }
            @Override public boolean disableIntegrationTests() { return false; }
            @Override public String ydbEndpoint() { return null; }
            @Override public String ydbDatabase() { return null; }
        };
        YdbHelperFactory factory = YdbHelperFactory.createYdbHelper(environment);
        if (!factory.isEnabled()) {
            throw new IllegalStateException("A Docker-compatible test runtime is required");
        }
        try (YdbHelper helper = factory.createHelper();
             GrpcTransport transport = helper.createTransport();
             QueryClient client = QueryClient.newClient(transport).build()) {
            SessionRetryContext retry = SessionRetryContext.create(client).build();
            retry.supplyResult(session -> session.createQuery("SELECT 1;", TxMode.NONE).execute())
                    .join().getStatus().expectSuccess("YDB query failed");
            System.out.println("Query succeeded through " + helper.endpoint()
                    + " database " + helper.database());
        }
    }
}
