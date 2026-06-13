import { LogOut } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className={buttonVariants({ variant: "secondary", className: "h-10 rounded-md" })} type="submit">
        <LogOut className="mr-2 size-4" />
        Logout
      </button>
    </form>
  );
}
