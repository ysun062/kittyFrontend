import React, { useEffect, useState } from 'react';
import { Form, Grid } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import { TxButton } from './substrate-lib/components';
import _ from 'lodash'
import KittyCards from './KittyCards';

// Construct a Kitty ID from storage key
const convertToKittyHash = entry =>
    `0x${entry[0].toJSON().slice(-64)}`;

// Construct a Kitty object
const constructKitty = (hash, { dna, price, owner }) => ({
    id: hash,
    dna,
    price: price.toJSON(),
    owner: owner.toJSON()
});

// Use React hooks
export default function Kitties(props) {
    const { api, keyring } = useSubstrate();
    const { accountPair } = props;

    const [kittyHashes, setKittyHashes] = useState([]);
    const [kitties, setKitties] = useState([]);
    const [status, setStatus] = useState('');
    const [kittiesCount, setKittiesCount] = useState(0);

    const fetchKittiesCount = () => {
        api.query.substrateKitties.kittyCnt(c => {
            if (c > 0){
                setKittiesCount(_.parseInt(c))
            }
        }).catch(console.error)
    }

    //Subscription function for setting Kitty ID
    const subscribeKittyCnt = () => {
        let unsub = null

        const asyncFetch = async () => {
            //First we need to query Kitty count from runtime
            unsub = await api.query.substrateKitties.kittyCnt(async cnt => {
                //Fetch all Kitty objects using entries()
                const entries = await api.query.substrateKitties.kitties.entries()
                //Retrieve the kitty ID and then set the state
                const hashes = entries.map(convertToKittyHash)
                setKittyHashes(hashes)
            })
        }

        asyncFetch()

        //return the unsubscruption cleanup function   
        return () => {
            unsub & unsub()
        }
    }

    //Subscription function to construct a Kitty object
    const subscribeKitties = () => {
        let unsub = null

        const asyncFetch = async () => {
            //Get Kitty object from runtime storage
            unsub = await api.query.substrateKitties.kitties.multi(kittyHashes, kitties => {
                // Create an array of Kitty object from 'constructKitty'
                const kittyArr = kitties.map((kitty, ind) =>
                    constructKitty(kittyHashes[ind], kitty.value)
                )
                // Set the array of kitty objects to state
                setKitties(kittyArr)
            })
        }

        asyncFetch()

        // return the unsubscription cleanup function
        return () => {
            unsub && unsub()
        }
    }

    useEffect(subscribeKitties, [api, kittyHashes]);
    useEffect(subscribeKittyCnt, [api, keyring]);
    useEffect(fetchKittiesCount, [api, keyring]);

    return <Grid.Column width={16}>
        <h1>We have {kittiesCount} Kitties</h1>
        <KittyCards kitties={kitties} accountPair={accountPair} setStatus={setStatus} />
        <Form style={{ margin: '1em 0' }}>
            <Form.Field style={{ textAlign: 'center' }}>
                <TxButton
                    accountPair={accountPair} label='Create Kitty' type='SIGNED-TX' setStatus={setStatus}
                    attrs={{
                        palletRpc: 'substrateKitties',
                        callable: 'createKitty',
                        inputParams: [],
                        paramFields: []
                    }}
                />
            </Form.Field>
        </Form>
        <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Grid.Column>;

}
