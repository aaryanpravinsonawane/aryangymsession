import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let recovered = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recovered = true;
        setReady("ok");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session || recovered) setReady("ok");
      else setTimeout(() => setReady(r => (r === "checking" ? "invalid" : r)), 800);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-2xl day-chip-push flex items-center justify-center mb-4">
            <KeyRound className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a new password</p>
        </div>

        {ready === "checking" ? (
          <div className="card-elevated p-6 text-center text-sm text-muted-foreground">Checking recovery link…</div>
        ) : ready === "invalid" ? (
          <div className="card-elevated p-6 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">This reset link is invalid or expired. Request a new one.</p>
            <Link to="/auth" className="inline-block">
              <Button className="h-10 px-4 font-semibold">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card-elevated p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
              {loading ? "…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
