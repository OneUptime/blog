import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public final class JdbcRead implements AutoCloseable {
    private final HikariDataSource pool;

    public JdbcRead(String url, String caFile, String tokenFile) {
        if (!url.startsWith("jdbc:ydb:grpcs://")) {
            throw new IllegalArgumentException("Supply a TLS YDB JDBC URL");
        }
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setDriverClassName("tech.ydb.jdbc.YdbDriver");
        config.addDataSourceProperty("secureConnectionCertificate", caFile);
        config.addDataSourceProperty("tokenFile", tokenFile);
        config.setMaximumPoolSize(16);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(5000);
        pool = new HikariDataSource(config);
    }

    public int checkQuery() throws SQLException {
        try (Connection connection = pool.getConnection();
             Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT 1 AS probe;")) {
            if (!rows.next()) throw new SQLException("Missing probe result");
            return rows.getInt(1);
        }
    }

    @Override public void close() { pool.close(); }
}
