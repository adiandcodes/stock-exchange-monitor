import { createRoot } from "react-dom/client";
import App from "./App";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(import.meta.env.VITE_API_URL || "");
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
