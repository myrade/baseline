// Currently this file uses an ephemeral in-memory org registry,
// so all clients need to be connected to same node service.
// Should probably be replaced with something like redis

// Also uses very insecure session ids, but security isn't major concern

const express = require('express')
const router = express.Router()

const orgRegistry = new Map()
const { v4: uuidv4 } = require('uuid');

const { orgEventType } = require('./messaging/eventType.js')
const KafkaProducer = require('./messaging/producer.js');
const producer = new KafkaProducer('orgReg', orgEventType);

const { hash } = require('./utils/hash.js')

router.get('/:id', (req, res) => {
    if (orgRegistry.has(req.params.id)) {
        return res.json({id: req.params.id, name: orgRegistry.get(req.params.id).name})
    }

    res.sendStatus(404)
})

router.post('', async (req, res) => {
    const id = uuidv4()

    if (req.body.name) {
        let org = { id, name: req.body.name }
        orgRegistry.set(id, org)

        await producer.queue(org, orgEventType)

        return res.json({id: id})
    }

    res.sendStatus(400)
})

const organizationExists = (id) => {
    return orgRegistry.has(id)
}

const insertOrg = (organization) => {
    if (orgRegistry.has(organization.id)) {
        console.log(`organization with id ${organization.id} already exists`)
        return;
    }

    console.log('adding new organization ', organization)
    orgRegistry.set(organization.id, {
        id: organization.id,
        name: organization.name
    })
}

// const updateOrgHash = async (id, hash) => {
//     if (!orgRegistry.has(id)) {
//         console.log('can not update org, org doesnt exists ', id)
//         return
//     }

//     const organization = orgRegistry.get(id)
//     organization.hash = hash
//     orgRegistry.set(id, organization)

//     // once organization is ready we can send it to other player
//     console.log('sending org reg type ', organization)
//     await producer.queue(organization, orgEventType)
// }
    
module.exports = {
    organizationRouter: router,
    organizationExists,
    insertOrg
}