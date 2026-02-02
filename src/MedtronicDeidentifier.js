import { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { 
  AppBar, 
  Autocomplete, 
  Box, 
  Button,
  Card, 
  Checkbox, 
  Container, 
  Divider,
  FormControlLabel,
  Grid, 
  Link,
  TextField,
  Toolbar, 
  Typography,
} from "@mui/material";

import { FilePond, File } from 'react-filepond';
import 'filepond/dist/filepond.min.css'

function _arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}

function replaceDateTimeString( text, shift ) {
  const originalDate = new Date(text);
  const newDate = new Date(originalDate.getTime() + shift);
  return newDate.toISOString()
}

function replaceJSONTimestamp( item, shift ) {
  if (typeof item === "object") {
    for (let key in item) {
      item[key] = replaceJSONTimestamp(item[key], shift);
    }

    if (!Array.isArray(item)) {
      let newItem = JSON.parse(JSON.stringify({}));
      for (let key in item) {
        if (key.endsWith("Z")) {
          try {
            const newDate = replaceDateTimeString(key, shift);
            newItem[newDate] = item[key];
          } catch (error) {
            newItem[key] = item[key];
          }
        } else {
          newItem[key] = item[key];
        }
      }
      return newItem;
    }

  } else if (typeof item === "string") {
    if (item.endsWith("Z")) {
      try {
        return replaceDateTimeString(item, shift);
      } catch (error) {
        // Do nothing
      }
    }
  }
  return item;
}

export default function MedtronicDeidentifier() {
  const [encryptionKey, setEncryptionKey] = useState({
    keepdate: false,
    encrypt: false,
    rawKey: "",
    salt: "",
    token: null
  });
  const [files, setFiles] = useState([]);

  const getFernetToken = async (rawKey, salt) => {
    const derivedKey = await window.crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-512", salt: salt, iterations: 500000 }, 
                                                            rawKey, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const keyArray = await window.crypto.subtle.exportKey("raw", derivedKey);
    let secret = new window.fernet.Secret(_arrayBufferToBase64(keyArray))
    return new fernet.Token({
      secret: secret,
    });
  }

  const handleFileUploa = (fieldName, file, metadata, load, error, progress, abort, transfer, options) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      progress(true, 1, 14);
      let json = JSON.parse(event.target.result);

      if (!encryptionKey.encrypt) {
        let shift = encryptionKey.keepdate ? 0 : -new Date(json.SessionDate).getTime();
        json = replaceJSONTimestamp(json, shift);

        for (let key of ["Initial", "Final"]) {
          json.PatientInformation[key].PatientFirstName = "";
          json.PatientInformation[key].PatientLastName = "";
          json.PatientInformation[key].PatientId = "";
          json.PatientInformation[key].ClinicianNotes = "";
          json.DeviceInformation[key].NeurostimulatorSerialNumber = "";
          json.DeviceInformation[key].DeviceName = "";
          if (encryptionKey.keepdate) {
            json.PatientInformation[key].PatientDateOfBirth = "2000-01-01T00:00:00Z";
          }
        }

      } else {
        var enc = new TextEncoder();
        let salt = window.crypto.randomUUID();
        let token = null;
        
        const rawKey = await window.crypto.subtle.importKey("raw", enc.encode(encryptionKey.rawKey), { name: "PBKDF2", hash: "SHA-512" }, false, ["deriveKey", "deriveBits"]);
        const derivedKey = await window.crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-512", salt: enc.encode(salt), iterations: 100000 }, 
              rawKey, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        const keyArray = await window.crypto.subtle.exportKey("raw", derivedKey);
        const dv = new DataView(keyArray, 0);

        let shift = encryptionKey.keepdate ? 0 : ((dv.getUint32(0) * dv.getUint32(8) / dv.getUint32(16)) + (dv.getUint32(4) - dv.getUint32(12)));
        json = replaceJSONTimestamp(json, shift);
        json.TimeShiftSalt = salt;
        
        let state = 2;
        for (let key of ["Initial", "Final"]) {
          salt = window.crypto.randomUUID().replaceAll("-","");
          token = await getFernetToken(rawKey, enc.encode(salt));
          json.PatientInformation[key].PatientFirstName = token.encode(json.PatientInformation[key].PatientFirstName);
          json.PatientInformation[key].PatientFirstName = json.PatientInformation[key].PatientFirstName.slice(0,9) + salt + json.PatientInformation[key].PatientFirstName.slice(9);
          progress(true, state++, 14);

          salt = window.crypto.randomUUID().replaceAll("-","");
          token = await getFernetToken(rawKey, enc.encode(salt));
          json.PatientInformation[key].PatientLastName = token.encode(json.PatientInformation[key].PatientLastName);
          json.PatientInformation[key].PatientLastName = json.PatientInformation[key].PatientLastName.slice(0,9) + salt + json.PatientInformation[key].PatientLastName.slice(9);
          progress(true, state++, 14);
          
          salt = window.crypto.randomUUID().replaceAll("-","");
          token = await getFernetToken(rawKey, enc.encode(salt));
          json.PatientInformation[key].PatientId = token.encode(json.PatientInformation[key].PatientId);
          json.PatientInformation[key].PatientId = json.PatientInformation[key].PatientId.slice(0,9) + salt + json.PatientInformation[key].PatientId.slice(9);
          progress(true, state++, 14);
          
          salt = window.crypto.randomUUID().replaceAll("-","");
          token = await getFernetToken(rawKey, enc.encode(salt));
          json.PatientInformation[key].ClinicianNotes = token.encode(json.PatientInformation[key].ClinicianNotes);
          json.PatientInformation[key].ClinicianNotes = json.PatientInformation[key].ClinicianNotes.slice(0,9) + salt + json.PatientInformation[key].ClinicianNotes.slice(9);
          progress(true, state++, 14);
          
          salt = window.crypto.randomUUID().replaceAll("-","");
          token = await getFernetToken(rawKey, enc.encode(salt));
          json.DeviceInformation[key].NeurostimulatorSerialNumber = token.encode(json.DeviceInformation[key].NeurostimulatorSerialNumber);
          json.DeviceInformation[key].NeurostimulatorSerialNumber = json.DeviceInformation[key].NeurostimulatorSerialNumber.slice(0,9) + salt + json.DeviceInformation[key].NeurostimulatorSerialNumber.slice(9);
          progress(true, state++, 14);

          salt = window.crypto.randomUUID().replaceAll("-","");
          token = await getFernetToken(rawKey, enc.encode(salt));
          json.DeviceInformation[key].DeviceName = token.encode(json.DeviceInformation[key].DeviceName);
          json.DeviceInformation[key].DeviceName = json.DeviceInformation[key].DeviceName.slice(0,9) + salt + json.DeviceInformation[key].DeviceName.slice(9);
          progress(true, state++, 14);
        }
      }

      var downloader = document.createElement('a');
      downloader.href = 'data:application/json;charset=utf-8,' + encodeURI(JSON.stringify(json));
      downloader.target = '_blank';
      downloader.download = "Deidentified_" + file.name;
      downloader.click();

      load("Sucess")
    }
    reader.readAsText(file);

    // Should expose an abort method so the request can be cancelled
    return {
        abort: () => {
            // Let FilePond know the request has been cancelled
            abort();
        },
    };
  }


  useEffect(() => {
    
  }, [])

  return (
    <Box marginTop={5}>
      <Box>
      <Typography variant="h5" fontFamily={"lato"}>
        {"Patient Health Information Definition:"}
      </Typography>
      <br/>
      <Typography variant="h6" fontSize={21} fontWeight={"bold"} fontFamily={"lato"}>
        {"1: Patient Identifiers in PatientInformation Structure"}
      </Typography>
      <Typography variant="p" fontFamily={"lato"}>
        {"PatientInformation contains 'Pre' and 'Post' visit configurations, \
        with most notable PHI including: 1) First Name (PatientFirstName), 2) Last Name (PatientFirstName) \
        3) Date of Birth (PatientDateOfBirth), 4) Medical Record Number (PatientId), and 5) Clinician Notes (ClinicianNotes, free-form notes that highly possible containing PHI)"}
      </Typography>
      <br/>
      <Typography variant="h6" fontSize={21} fontWeight={"bold"} fontFamily={"lato"}>
        {"2: Device Identifiers in DeviceInformation Structure"}
      </Typography>
      <Typography variant="p" fontFamily={"lato"}>
        {"DeviceInformation contains 'Pre' and 'Post' visit configurations, \
        with most notable PHI including: 1) Device Serial Number (NeurostimulatorSerialNumber), 2) Date of IPG Implant (ImplantDate, and AccumulatedTherapyOnTimeSinceImplant | AccumulatedTherapyOnTimeSinceFollowup) \
        and 3) Device Name (It is hard to say if someone will name a Device with Identifier or not...)"}
      </Typography>
      <br/>
      <Typography variant="h6" fontSize={21} fontWeight={"bold"} fontFamily={"lato"}>
        {"3: Timestamps"}
      </Typography>
      <Typography variant="p" fontFamily={"lato"}>
        {"All timestamps are PHI according to Section 164.514(a) of the HIPAA Privacy Rule. \
        This is because all session information can be considered a clinic visit and time of clinic visit is PHI."}
      </Typography>
      </Box>

      <Box marginTop={3}>
      <Typography variant="h5" fontFamily={"lato"}>
        {"Deidentification Rationales:"}
      </Typography>
      <Typography variant="p" fontFamily={"lato"}>
        {"Two main deidentification processes are available: 1) Nonrecoverable Deidentification and 2) Recoverable Deidentification (Encryption). \
        Essentially, if something is encrypted, we can recover it back to PHI state with a KEY. \
        If you do not want the deidentification process to be reversible, we will simply be deleting PHI from the file."}<br/>
        {"This doesn't mean we are modifying directly on the file you uploaded, you will still keep your original file you upload to this webpage \
        (locally on your computer of course). The deidentification process will prompt the webpage to send you a new file that is deidentified."}
      </Typography>
      <br/>
      <Typography variant="h6" fontSize={21} fontWeight={"bold"} fontFamily={"lato"}>
        {"1: Nonrecoverable Deidentification"}
      </Typography>
      <Typography variant="p" fontFamily={"lato"}>
        {"Default Method is to perform deidentification with no way of recovering. \
        We will simply be removing all of the PHI content and replace them with empty string \"\"."}<br/>
        {"For all timestamps, we will use the SessionDateTime as reference and set that to Time-zero (1970-01-01) while all other time are in relative to this session date time."}<br/>
        {"This does mean that IF you know the original session date, you can potentially get back the other timestamps. However, the original timestamp is already a PHI, \
        if an attacker knows that PHI already that is a risk coming from some other sources that is not from the session JSON file."}
      </Typography>
      <br/>
      <br/>
      <Typography variant="h6" fontSize={21} fontWeight={"bold"} fontFamily={"lato"}>
        {"2: Encryption Path"}
      </Typography>
      <Typography variant="p" fontFamily={"lato"}>
        {"We will be using "}<Link href={"https://www.npmjs.com/package/fernet"}>{"Fernet Encryption"}</Link>{" for encrypting the PHI. "}
        {"We use a simple implementation on the client side browser of the Fernet method because of our previous Python Application also uses this method for some security stuff. "}
        <br></br>{"You can read more about it in "}<Link href={"https://www.comparitech.com/blog/information-security/what-is-fernet/"}>{"this link"}</Link><br/><br/>
        <b>{"Of course, the developer also acknowledged that we should never do any Encryption on the Client side (although we are not technically a client side system in a client-server point-of-view... but still), \
        and you should definitely communicate with your local institutional security team to make sure our method is acceptable for decryption or not!"}</b><br/><br/>
        {"I have taken my best attempt at creating a system that is hopefully complex enough for the encrpytion to be reasonably safe, with procedure described below."}<br/>
        {"#1. Key Generation"}<br/>
        {"To encrypt, user must enter an encryption master key. This key should be kept by the user and the browser does not store this information in LocalStorage."}<br/>
        {"This master key will be used as the source of generation derived keys using "}<Link href={"https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API"}>{"Web Crypto API"}</Link>{"."}<br/>
        {"The derived key is created from master key and random salt, which means you will need two items to recreate this derived key. "}<br/>
        {"Then Fernet will be used to create the encryption code, and Fernet by default also utilize timestamp to make encryption, which means the same Password, the same salt, \
        the same message will still be encrypted as different string. \
        And yes, if you are encrpyting multiple files with the same password, you can decrypt them into the same message, \
        but they will appear differently in the raw session JSON file, this is not the same method as simply hashing a password. \
        Please check the source code of this webpage to identify the exact algorithms used for hashing/encryption"}<br/>
        {"#2. Time Shift"}<br/>
        {"All timestamp are shifted by a random number of seconds calculated from a random byte operation on yet another derived key using different salt. "}
        {"This salt is stored in the session JSON file as a new field so people with the original key may decrypt this."}
        
        <br/><br/>
        <b>{"As of now I do not plan to make decryption code on this website. If you know the algorithm in this source code, you can perform decryption on your favourite programming language"}</b>
      </Typography>
      </Box>
      <Divider style={{marginTop: 50, marginBottom: 50}}/>
      <Box>
        <Box>
          <FormControlLabel control={
            <Checkbox defaultChecked value={!encryptionKey.encrypt} onChange={(event) => {
              if (event.target.checked) {
                setEncryptionKey({...encryptionKey, 
                  encrypt: false,
                  rawKey: "",
                  keyArray: "",
                  token: null
                })
              } else {
                setEncryptionKey({...encryptionKey,
                  encrypt: true,
                  rawKey: "",
                  keyArray: "",
                  token: null
                })
              }
            }}/>
          } label={"Complete Removal of PHI (Not-Recoverable)"}/>
        </Box>
        {encryptionKey.encrypt ? (
          <Box display={"flex"} flexDirection={"row"} >
            <TextField variant="filled" type={"password"} name={"encryption-master-key"} fullWidth label={"Encryption Master Key"} value={encryptionKey.rawKey} onChange={async (event) => {
              setEncryptionKey({...encryptionKey, rawKey: event.target.value});
              setFiles([]);
            }} />
          </Box>
        ) : null}
        <Box>
          <FormControlLabel control={
            <Checkbox value={encryptionKey.keepdate} onChange={(event) => {
              if (event.target.checked) {
                setEncryptionKey({...encryptionKey, 
                  keepdate: true,
                })
              } else {
                setEncryptionKey({...encryptionKey, 
                  keepdate: false,
                })
              }
            }}/>
          } label={"Keep Timestamps (Except DOB)"}/>
        </Box>
        <Box marginTop={5}>
          <FilePond
            name="File" 
            files={files} allowMultiple allowRevert={false}
            acceptedFileTypes={[".json"]}
            onupdatefiles={setFiles}
            maxFiles={1000}
            server={{
              url: "",
              process: handleFileUploa
            }}
            labelFileProcessingError={(error) => {
              return error.body
            }}
            labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
          />
        </Box>
      </Box>
    </Box>
  )
}
