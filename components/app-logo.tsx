import Image from "next/image";
import Link from "next/link";

export function AppLogo() {
  return (
    <Link href="/" aria-label="Go to Channel Pulse home" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Image
        src="/app-icon.png"
        alt="Channel Pulse"
        width={64}
        height={64}
        className="size-16 rounded-lg object-cover shadow-sm"
        priority
      />
    </Link>
  );
}
