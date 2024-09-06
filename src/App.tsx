import { Observable, from, map, switchMap } from 'rxjs';
import { zencode_exec } from 'zenroom';
import axios from 'axios'



declare type ZenroomProps = {
    data?: string | null;
    keys?: string | null;
    conf?: string | null;
};
declare type ZenroomResult = {
    result: string;
    logs: string;
};



export class EncryptionService {
    private serverPublicKeyUrl: string;
    private sharedKeyUrl: string;

    private serverPublicKey: string;
    private privateKey: any;
    private clientId: string;
    public isReady: boolean = false;


    public initialize(
        serverPublicKeyUrl: string,
        sharedKeyUrl: string
    ): Observable<any> {
        // Initialize Encryption service and perform exchange of public keys
        this.serverPublicKeyUrl = serverPublicKeyUrl;
        this.sharedKeyUrl = sharedKeyUrl;
        // Generate Client ID
        return this.generateClientId().pipe(
            switchMap((clientId) => {
                // Get Server Public Key
                return this.getServerPublicKey();
            }),
            switchMap((result) => {
                // Store Server Public key
                this.serverPublicKey = result;
                // Generate Own Keychain
                return this.generateKeys();
            }),
            switchMap(() => {
                // Upload own public key with self client id
                return this.shareKey(this.clientId);
            }),
            switchMap(() => {
                // set service status as ready
                return new Observable((subscriber) => {
                    this.isReady = true;
                    subscriber.next({ clientID: this.clientId, isReady: this.isReady, serverPublicKey: this.serverPublicKey, privateKey: this.privateKey });
                    subscriber.complete();
                });
            })
        );
    }

    private generateClientId(): Observable<string> {
        const contract = `
    Rule check version 3.0.0
    Scenario simple: Generate a random object
    
    Given nothing
    
    When I create the random object of '16' bytes
    When I rename the 'random_object' to 'randombytes'
    
    Then print the 'randombytes' as 'hex'`;
        return this.execute_contract(contract).pipe(
            switchMap((result) => {
                return new Observable<string>((subscriber) => {
                    this.clientId = JSON.parse(result).randombytes;
                    subscriber.next(this.clientId);
                    subscriber.complete();
                });
            })
        );
    }
    private execute_contract(
        contract: string,
        props?: ZenroomProps
    ): Observable<string> {
        return from(
            zencode_exec(contract, props)
                .then((result) => {
                    return result.result;
                })
                .catch((error) => {
                    console.error(error);
                    throw error;
                })
        );
    }

    public generateKeys() {
        // Generate own private and public keys
        const contract = `
        Scenario 'ecdh': Generate a key
        Given I am 'c'
        When I create the ecdh key
        Then print my keyring
        `;

        return this.execute_contract(contract).pipe(
            map((result) => (this.privateKey = result))
        );
    }

    public getServerPublicKey(): Observable<string> {
        return from(axios.get<string>(this.serverPublicKeyUrl)).pipe(
            map(response => response.data)
        );
    }

    public shareKey(clientId: string) {
        // Generate shared key with the server's public key
        const contract = `
    Rule check version 3.0.0 
    Scenario 'ecdh': Generate public key
    Given that I am known as 'c' 
    Given that I have my valid 'keyring'
    When I create the ecdh public key
    Then print my 'ecdh public key'
    `;
        return this.execute_contract(contract, { keys: this.privateKey }).pipe(
            switchMap((result) => {
                return new Observable((subscriber) => {
                    let pubKey = JSON.parse(result).c.ecdh_public_key;
                    subscriber.next(pubKey);
                    subscriber.complete();
                });
            }),
            switchMap((pubKey) => {
                return axios.post<any>(`${this.sharedKeyUrl}${clientId}`, {
                    client_public_key: pubKey,
                });
            })
        );
    }

    public encryptMessage(message: any, serverPublicKey: string, privateKey: string) {
        // Encrypt message with the shared key and send to server
        const contract = `
    Rule check version 4.35.0 
    Scenario 'ecdh': Encrypt message
    Given that I am known as 'c' 
    Given that I have my valid 'keyring'
    Given that I a 'public key' from 's'
    Given that I have a 'string' named 'outgoingmessage'
    When I encrypt the secret message of 'outgoingmessage' for 's'
    When I rename the 'secret message' to 'message'
    
    Then print my 'message'
    `;
        let data = {
            s: serverPublicKey,
            outgoingmessage: JSON.stringify(message),
        };
        return this.execute_contract(contract, {
            data: JSON.stringify(data),
            keys: privateKey,
        });
    }

    public decryptMessage(encryptedData: any, serverPublicKey: string, privateKey: string) {

        // Decrypt message received from server
        const decrypt_contract = `
        Scenario 'ecdh': Decrypt message
        Given that I am known as 'c' 
        Given that I have my valid 'keyring'
        Given that I a 'public key' from 's'
        Given I have a 'secret message' named 'message' 
        When I decrypt the text of 'message' from 's' 

        Then print my 'text' as 'string'
    `;
        let data = {
            s: serverPublicKey,
            message: encryptedData,
        };
        let keys = privateKey;
        return this.execute_contract(decrypt_contract, {
            data: JSON.stringify(data),
            keys: keys,
        }).pipe(
            map((result) => {
                let decrypted_result = JSON.parse(result).c.text;
                try {
                    // Attempt to parse JSON
                    return JSON.parse(decrypted_result);
                } catch (_) {
                    // may be its not JSON
                    return decrypted_result;
                }
            })
        );
    }

    public getClientId(): string {
        return this.clientId;
    }

    public getIsReady(): boolean {
        return this.isReady;
    }

}