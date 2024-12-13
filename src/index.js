import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, useNavigate } from "react-router-dom";
import App from "App";

import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, } from "@mui/material";

function Main() {
  const navigate = useNavigate();

  useEffect(() => {
    
  }, []);

  return <App />
}

const root = createRoot(document.getElementById("root"))
root.render(
  <BrowserRouter>
    <CssBaseline />
    <Main/>
  </BrowserRouter>,
);
