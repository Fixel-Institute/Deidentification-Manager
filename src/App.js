import { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { 
  AppBar, 
  Autocomplete, 
  Box, 
  Card, 
  Container, 
  Divider,
  Grid, 
  Link,
  TextField,
  Toolbar, 
  Typography,
} from "@mui/material";

import MedtronicDeidentifier from "MedtronicDeidentifier";

export default function App() {
  const [component, setComponent] = useState(null);

  useEffect(() => {
    setComponent(<MedtronicDeidentifier />)
  }, [])

  return (
    <Box sx={{minHeight: "100vh"}}>
      <AppBar position="static">
        <Container>
          <Toolbar disableGutters>
            
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="#app-bar-with-responsive-menu"
              sx={{
                mr: 2,
                fontFamily: 'lato',
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Deidentification Manager (v0.1)
            </Typography>
          </Toolbar>
        </Container>
      </AppBar>
      <Box m={5}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{
              paddingLeft: {
                xs: 0,
                md: 10,
                lg: 15
              },
              paddingRight: {
                xs: 0,
                md: 10,
                lg: 15
              }
            }}>
              <Typography variant={"h6"}>
                {"The Deidentification Manager is a tool running completely on the Browser without Backend Server. "}<br/>
                {"All data upload will be managed on the Browser locally on your computer. "}<br/>
                {"If you have any concerns, please feel free to extract the tool directly from the "}
                <Link href="https://github.com/Fixel-Institute/Deidentification-Manager"> {"Github Repo"} </Link>
                {" and run this as a file"}<br/><br/>
              </Typography>
              
              <Typography variant={"h6"}>
                {"Different institutes or organizations will have different definition of deidentification, "}
                {"we will provide the details on what was changed/removed but please ensure you verify with your institute that this is sufficiently deidentified."}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Divider>
              {"Select File Type"}
            </Divider>
            <Box sx={{
              marginTop: 3,
              paddingLeft: {
                xs: 0,
                md: 10,
                lg: 15
              },
              paddingRight: {
                xs: 0,
                md: 10,
                lg: 15
              }
            }}>
            <Autocomplete
              fullWidth disableClearable
              defaultValue="Medtronic JSON"
              options={["Medtronic JSON"]}
              renderInput={(params) => <TextField variant="standard"  {...params} label="File Type" />}
              onChange={(event, newValue) => {
                if (newValue === "Medtronic JSON") {
                  setComponent(<MedtronicDeidentifier />)
                }
              }}
            />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{
              paddingLeft: {
                xs: 0,
                md: 10,
                lg: 15
              },
              paddingRight: {
                xs: 0,
                md: 10,
                lg: 15
              }
            }}>
              {component}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}
