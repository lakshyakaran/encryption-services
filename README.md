# Zenroom Encryption Service

This library provides an interface for encrypting and decrypting messages using Zenroom's cryptographic engine, with public key sharing and key generation features. It simplifies the process of establishing secure communication between clients and servers.

## Installation
To install the library, use npm or yarn:

```bash
npm install encryption-services
```
or

```bash
yarn add encryption-services
```

## Usage

### Importing the Library

import { EncryptionService } from 'encryption-services';

### Initialize the App

To initialize the encryption service, you need to provide the server's public key URL and a shared key URL:

```jsx
    const services = new EncryptionService();
```

```jsx 
services.initialize('https://server.com/public-key', 'https://server.com/shared-key').subscribe((data) => {
    setClientId(data.clientID)
    setIsReady(data.isReady)
    setServerPubKey(data.serverPublicKey)
    setPrivateKey(data.privateKey)
});
```

### The initialize Method Returns:

- `clientID`: A randomly generated client ID used to uniquely identify the client in communication with the server.
- `isReady`: A boolean value indicating whether the encryption service is ready to send and receive encrypted messages.
- `serverPublicKey`: The server's public key, which is used to encrypt messages sent to the server.
- `privateKey`: The client's private key, which is used to decrypt messages received from the server.

Once the initialization process is complete, these values can be used in the rest of the encryption and decryption processes.

### Encrypting Messages
To encrypt a message, call the encryptMessage method after the service is ready. Ensure that you pass the message, server public key, and the client's private key:

```jsx
function encryptMessage(message) {
    return new Promise((resolve, reject) => {
        services.encryptMessage(message, serverPubKey, privateKey).subscribe(
            (result) => {
                resolve(result);
            },
            (error) => {
                reject(error);
            }
        );
    });
}
```

### Decrypting Messages
To decrypt a message received from the server, use the decryptMessage method:

```jsx
function decryptResponse(message) {
    return new Promise((resolve, reject) => {
        services.decryptMessage(message, serverPubKey, privateKey).subscribe(
            (result) => {
                resolve(result);
            },
            (error) => {
                reject(error);
            }
        );
    });
}
```