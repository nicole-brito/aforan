import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SessionProvider, useSession } from "../lib/session";
import { Loading } from "../components/afora-ui";
import WelcomeFlow from "../components/WelcomeFlow";

function NotFoundComponent() {
  return (
    <div className="shell" style={{ paddingTop: 80, textAlign: "center" }}>
      <h1 className="title" style={{ fontSize: 64 }}>404</h1>
      <p className="lead" style={{ marginTop: 6 }}>
        esse rolê não existe.
      </p>
      <div style={{ marginTop: 18 }}>
        <Link to="/" className="btn">voltar pro início</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="shell" style={{ paddingTop: 80, textAlign: "center" }}>
      <h1 className="title">algo deu errado por aqui.</h1>
      <p className="lead" style={{ marginTop: 6 }}>
        respira fundo e tenta de novo.
      </p>
      <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          className="btn"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          tentar de novo
        </button>
        <a className="btn ghost" href="/">início</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "afora · painel do clube" },
      { name: "description", content: "gestor de clubes afora — marca rolês, faz check-in, cuida da presença." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lilita+One&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Sometype+Mono:wght@400;500;700&display=swap",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23FF4FA3'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='20' fill='white' text-anchor='middle'%3Ea%3C/text%3E%3C/svg%3E",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="page-bg" />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGate() {
  const { session } = useSession();
  if (session === undefined) return <Loading label="abrindo o afora..." />;
  if (!session) return <WelcomeFlow />;
  return <Outlet />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthGate />
      </SessionProvider>
    </QueryClientProvider>
  );
}
