import java.lang.ref.*;
import java.util.*;
public class ReferenceLab {
    static final ReferenceQueue<Object> queue = new ReferenceQueue<>();
    static final List<Reference<Object>> refs = new ArrayList<>();
    public static void main(String[] args) throws Exception {
        for (int i = 0; i < 100000; i++) {
            Object value = new byte[128];
            refs.add(switch (args[0]) {
                case "weak" -> new WeakReference<>(value, queue);
                case "soft" -> new SoftReference<>(value, queue);
                case "phantom" -> new PhantomReference<>(value, queue);
                default -> throw new IllegalArgumentException("weak, soft or phantom");
            });
        }
        System.gc();
        Thread.sleep(200);
        int drained = 0;
        while (queue.poll() != null) drained++;
        System.out.println("retained wrappers=" + refs.size() + " drained=" + drained);
    }
}
