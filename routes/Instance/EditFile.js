const express = require('express');
const router = express.Router();
const { db } = require('../../handlers/db.js');
const { isUserAuthorizedForContainer } = require('../../utils/authHelper');
const { editFile } = require('../../utils/fileHelper');

router.post("/instance/:id/files/edit/:filename", async (req, res) => {
    if (!req.user) return res.status(401).send('Authentication required');

    const { id, filename } = req.params;
    const { content } = req.body;

    const instance = await db.get(id + '_instance');
    if (!instance) return res.status(404).send('Instance not found');

    const isAuthorized = await isUserAuthorizedForContainer(req.user.userId, instance.Id);
    if (!isAuthorized) {
        return res.status(403).send('Unauthorized access to this instance.');
    }


    if(!instance.suspended) {
        instance.suspended = false;
        db.set(id + '_instance', instance);
    }

    if(instance.suspended === true) {
        return res.redirect('../../instances?err=SUSPENDED');
   }

    if (!instance.Node || !instance.Node.address || !instance.Node.port) {
        return res.status(500).send('Invalid instance node configuration');
    }

    try {
        const result = await editFile(instance, filename, content, req.query.path);
        res.json(result);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).send(error.response.data);
        } else {
            res.status(500).send({ message: 'Failed to communicate with node.' });
        }
    }
});

module.exports = router;